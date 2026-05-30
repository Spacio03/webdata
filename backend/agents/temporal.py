"""
Agent 3: Temporal Pattern Agent
Detects signal sequences over time and predicts future buying windows.
Patterns are seeded from known B2B buying behaviour; they self-improve via the Memory Agent.
"""
from __future__ import annotations
import re
from datetime import datetime, timedelta
from models import CompanyProfile, IntentSignal, BuyingWindowPrediction
from brightdata_client import search_company_news, scrape_job_postings


# ── Pattern library ───────────────────────────────────────────────────────────
# Each pattern: (id, label, trigger_check_fn, days_to_window, confidence_boost)
# trigger_check_fn receives (company, signals, news, jobs) → bool

PATTERNS = [
    {
        "id":            "series_a_funding",
        "label":         "Series A raised → GTM tooling budget opens in ~12 months",
        "days_to_window": 90,       # for demo: 90 days; real: 365
        "confidence":    0.82,
        "trigger":       lambda c, s, n, j: _has_recent_funding(n, ["series a", "series b"]),
    },
    {
        "id":            "hiring_spike_sales",
        "label":         "Sales headcount spike → buying sales enablement tools in ~90 days",
        "days_to_window": 45,
        "confidence":    0.76,
        "trigger":       lambda c, s, n, j: _has_hiring_spike(j, ["sales", "sdr", "account executive", "bdr"]),
    },
    {
        "id":            "revops_hire",
        "label":         "RevOps hire → evaluating the entire sales stack imminently",
        "days_to_window": 30,
        "confidence":    0.88,
        "trigger":       lambda c, s, n, j: _has_hiring_spike(j, ["revenue operations", "revops", "sales operations"]),
    },
    {
        "id":            "cro_replacement",
        "label":         "New CRO or VP Sales → re-evaluating entire GTM stack",
        "days_to_window": 45,
        "confidence":    0.90,
        "trigger":       lambda c, s, n, j: _has_leadership_change(n, ["chief revenue officer", "cro", "vp sales", "vp of sales"]),
    },
    {
        "id":            "competitor_pain",
        "label":         "Negative competitor reviews detected → active re-evaluation",
        "days_to_window": 14,
        "confidence":    0.80,
        "trigger":       lambda c, s, n, j: _has_competitor_pain_signal(s),
    },
    {
        "id":            "dark_funnel_high",
        "label":         "Multiple dark funnel signals → buyer is researching right now",
        "days_to_window": 7,
        "confidence":    0.85,
        "trigger":       lambda c, s, n, j: _has_multiple_dark_funnel(s, threshold=2),
    },
]


# ── Main entry point ──────────────────────────────────────────────────────────

async def predict_buying_window(
    company: CompanyProfile,
    signals: list[IntentSignal],
) -> BuyingWindowPrediction | None:
    """
    Fetch live news + jobs for the company, then match against the pattern library.
    Returns the highest-confidence matching pattern, or None if no match.
    """
    try:
        news = await search_company_news(company.name)
    except Exception:
        news = []
    try:
        jobs = await scrape_job_postings(company.name, limit=10)
    except Exception:
        jobs = []

    best: BuyingWindowPrediction | None = None

    for pattern in sorted(PATTERNS, key=lambda p: p["confidence"], reverse=True):
        try:
            triggered = pattern["trigger"](company, signals, news, jobs)
        except Exception:
            triggered = False

        if triggered:
            evidence = _build_evidence(pattern["id"], news, jobs, signals)
            prediction = BuyingWindowPrediction(
                triggered_pattern=pattern["id"],
                pattern_label=pattern["label"],
                days_to_window=pattern["days_to_window"],
                confidence=pattern["confidence"],
                evidence=evidence,
            )
            if best is None or prediction.confidence > best.confidence:
                best = prediction

    return best


# ── Pattern trigger helpers ───────────────────────────────────────────────────

def _has_recent_funding(news: list[dict], keywords: list[str]) -> bool:
    for item in news:
        text = (item.get("title", "") + " " + item.get("snippet", "")).lower()
        if any(kw in text for kw in keywords):
            return True
    return False


def _has_hiring_spike(jobs: list[dict], role_keywords: list[str]) -> bool:
    matching = sum(
        1 for j in jobs
        if any(kw in (j.get("title", "") + j.get("snippet", "")).lower() for kw in role_keywords)
    )
    return matching >= 2


def _has_leadership_change(news: list[dict], titles: list[str]) -> bool:
    change_words = ["appointed", "joins as", "named", "hired as", "new ", "welcomes"]
    for item in news:
        text = (item.get("title", "") + " " + item.get("snippet", "")).lower()
        if any(t in text for t in titles) and any(w in text for w in change_words):
            return True
    return False


def _has_competitor_pain_signal(signals: list[IntentSignal]) -> bool:
    return any(s.signal_type == "review_activity" and s.confidence >= 0.65 for s in signals)


def _has_multiple_dark_funnel(signals: list[IntentSignal], threshold: int = 2) -> bool:
    df_signals = [s for s in signals if s.signal_type in ("dark_funnel", "job_posting")]
    return len(df_signals) >= threshold


def _build_evidence(pattern_id: str, news: list[dict], jobs: list[dict], signals: list[IntentSignal]) -> str:
    parts = []
    if news:
        parts.append(f"News: {news[0]['title']}")
    relevant_jobs = [j for j in jobs if "sales" in j.get("title", "").lower() or "revenue" in j.get("snippet", "").lower()]
    if relevant_jobs:
        parts.append(f"Hiring: {relevant_jobs[0]['title']}")
    df = [s.evidence[:100] for s in signals if s.signal_type in ("dark_funnel", "review_activity")]
    if df:
        parts.append(f"Intent: {df[0]}")
    return " | ".join(parts) if parts else "Multiple corroborating signals detected."

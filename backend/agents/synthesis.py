"""
Agent 5: Synthesis Agent (Orchestrator)
Takes all agent outputs and:
  1. Computes a composite OpportunityScore (0–100)
  2. Writes a crisp AccountBrief (why this account, why now)
  3. Generates personalised outreach drafts per stakeholder
Powered by AI/ML API (OpenAI-compatible).
"""
from __future__ import annotations
import os
from openai import AsyncOpenAI
from models import (
    CompanyProfile, IntentSignal, BuyingWindowPrediction,
    Stakeholder, OutreachDraft,
)
from demo_data import fallback_brief, fallback_draft

MODEL = os.getenv("AIML_MODEL", "gpt-4o")


def _client() -> AsyncOpenAI | None:
    key = os.getenv("AIML_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    return AsyncOpenAI(
        api_key=key,
        base_url=os.getenv("AIML_BASE_URL", "https://api.aimlapi.com/v1"),
    )


# ── Signal interpretation labels ─────────────────────────────────────────────

_SIGNAL_LABELS: dict[str, str] = {
    "hiring_spike":    "Hiring spike detected",
    "funding":         "Funding announced",
    "dark_funnel":     "Dark funnel activity",
    "review_activity": "Competitor review activity",
    "job_posting":     "Relevant job posting",
}

_SIGNAL_INTERPRETATIONS: dict[str, str] = {
    "hiring_spike":    "Company is scaling GTM headcount — budget and tooling decisions follow within 30–90 days.",
    "funding":         "Fresh capital means new budget cycles and a mandate to build out the GTM stack.",
    "dark_funnel":     "Buyers are actively researching solutions — they're in evaluation mode right now.",
    "review_activity": "Negative competitor reviews signal dissatisfaction and active re-evaluation.",
    "job_posting":     "Job description reveals tech stack gaps or active vendor evaluation.",
}


# ── Opportunity Score ─────────────────────────────────────────────────────────

def compute_opportunity_score(
    company:        CompanyProfile,
    signals:        list[IntentSignal],
    buying_window:  BuyingWindowPrediction | None,
    committee:      list[Stakeholder],
) -> float:
    """
    Weighted composite score (0–100):
    - ICP fit          20 pts
    - Signal strength  30 pts
    - Buying window    30 pts
    - Committee depth  20 pts
    Also annotates each signal with ai_interpretation and score_impact in-place.
    """
    score = 0.0

    # ICP fit
    icp_pts = company.icp_score * 20
    score += icp_pts

    # Signal strength (up to 30) — annotate each signal with its contribution
    if signals:
        avg_confidence = sum(s.confidence for s in signals) / len(signals)
        depth_bonus    = min(len(signals) / 5, 1.0)
        signal_pts     = avg_confidence * 20 + depth_bonus * 10
        score += signal_pts
        per_signal_pts = signal_pts / len(signals)
        for s in signals:
            s.score_impact = round(s.confidence * per_signal_pts, 1)
            if not s.ai_interpretation:
                s.ai_interpretation = _SIGNAL_INTERPRETATIONS.get(
                    s.signal_type,
                    "Indicates active buying motion at this account.",
                )

    # Buying window (up to 30)
    if buying_window:
        score += buying_window.confidence * 30

    # Committee depth (up to 20)
    if committee:
        has_champion  = any(s.role_in_deal == "champion" for s in committee)
        has_eco_buyer = any(s.role_in_deal == "economic_buyer" for s in committee)
        score += 10 if has_champion else 0
        score += 10 if has_eco_buyer else 0

    return min(round(score, 1), 100.0)


# ── Account Brief ─────────────────────────────────────────────────────────────

async def generate_account_brief(
    company:        CompanyProfile,
    signals:        list[IntentSignal],
    buying_window:  BuyingWindowPrediction | None,
    your_product:   str,
    account_history: str = "",
) -> str:
    """
    Generates a crisp 3-paragraph account brief:
    - Why this account
    - Why now (signal evidence)
    - Recommended angle
    """
    signal_summary = "\n".join(
        f"- [{s.signal_type.upper()}] {s.evidence[:150]} (confidence: {s.confidence:.0%})"
        for s in signals[:5]
    )
    window_text = (
        f"Buying Window: {buying_window.pattern_label} — {buying_window.days_to_window} days. "
        f"Evidence: {buying_window.evidence}"
        if buying_window else "No specific buying window detected yet."
    )
    history_text = (
        f"\nPast interactions from memory:\n{account_history}"
        if account_history else ""
    )

    prompt = f"""You are a senior B2B sales strategist. Write a concise account brief (3 short paragraphs, max 200 words total) for a sales rep about to reach out to this account.

Company: {company.name} ({company.domain})
Description: {company.description}
Funding: {company.funding or 'Unknown'}
Estimated headcount: {company.headcount or 'Unknown'}

Live signals detected:
{signal_summary}

{window_text}
{history_text}

Our product: {your_product}

Write:
1. WHY THIS ACCOUNT (ICP fit, key facts)
2. WHY NOW (the specific signals, don't be vague)
3. RECOMMENDED ANGLE (what hook/angle to lead with)

Be specific. Use the signal evidence. No fluff."""

    c = _client()
    if not c:
        return fallback_brief(company, signals, buying_window, your_product)
    try:
        response = await c.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[Synthesis] Brief generation failed, using template: {e}")
        return fallback_brief(company, signals, buying_window, your_product)


# ── Per-Persona Outreach Drafts ───────────────────────────────────────────────

async def generate_outreach_draft(
    stakeholder:   Stakeholder,
    company:       CompanyProfile,
    account_brief: str,
    your_product:  str,
    sender_name:   str,
    sender_company: str,
) -> OutreachDraft:
    """
    Generates a personalised cold email for one stakeholder.
    The email is short (5–7 sentences), specific, and leads with a signal.
    """
    prompt = f"""You are a world-class B2B sales rep. Write a cold outreach email to:

Name: {stakeholder.name}
Title: {stakeholder.title}
Company: {company.name}
Their role in the buying process: {stakeholder.role_in_deal}
Personalisation hook: {stakeholder.hook}

Account context:
{account_brief}

Our product: {your_product}
Sender: {sender_name} at {sender_company}

Rules:
- Max 100 words in the body
- Lead with ONE specific signal or observation (not a generic opener)
- No "I hope this finds you well" or similar filler
- End with a soft, specific CTA (not "let me know if you're interested")
- Tone: peer-to-peer, not salesy
- Write in first person as {sender_name}

Return JSON with these exact keys:
{{
  "subject_lines": ["option 1", "option 2", "option 3"],
  "body": "email body here",
  "cta": "the specific call to action"
}}"""

    c = _client()
    if not c:
        return fallback_draft(stakeholder, company, sender_name, sender_company)
    try:
        response = await c.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.5,
            response_format={"type": "json_object"},
        )

        import json
        data = json.loads(response.choices[0].message.content)

        return OutreachDraft(
            stakeholder_name=stakeholder.name,
            stakeholder_title=stakeholder.title,
            subject_lines=data.get("subject_lines", ["Quick question about your sales stack"]),
            body=data.get("body", ""),
            cta=data.get("cta", "Worth a 15-min call?"),
        )
    except Exception as e:
        print(f"[Synthesis] Draft generation failed for {stakeholder.name}, using template: {e}")
        return fallback_draft(stakeholder, company, sender_name, sender_company)


async def generate_why_now_bullets(
    company: CompanyProfile,
    signals: list[IntentSignal],
    buying_window: BuyingWindowPrediction | None,
) -> list[str]:
    """3–5 short bullets, each citing a specific signal."""
    if not signals and not buying_window:
        return [f"{company.name} matches your ICP — run live discovery for signals."]

    if os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes"):
        return [
            s.evidence[:90] for s in signals[:4]
        ] or [buying_window.pattern_label if buying_window else "Signals detected"]

    evidence = "\n".join(f"- {s.evidence[:120]}" for s in signals[:6])
    window = buying_window.pattern_label if buying_window else ""
    prompt = f"""Company: {company.name}
Signals:
{evidence}
Buying window: {window}

Return exactly 3-5 short bullet strings (JSON array of strings). Each bullet must cite ONE specific fact from the signals. Max 12 words per bullet. No generic fluff."""

    c = _client()
    if c:
        try:
            import json
            response = await c.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            data = json.loads(response.choices[0].message.content)
            bullets = data.get("bullets") or data.get("why_now") or data.get("items")
            if isinstance(bullets, list) and bullets:
                return [str(b) for b in bullets[:5]]
        except Exception as e:
            print(f"[Synthesis] why_now bullets failed: {e}")

    bullets = []
    for s in signals[:4]:
        label = _SIGNAL_LABELS.get(s.signal_type, s.signal_type)
        bullets.append(f"{label}: {s.evidence[:70]}")
    if buying_window and len(bullets) < 5:
        bullets.append(f"{buying_window.pattern_label} ({buying_window.days_to_window}d window)")
    return bullets[:5]


async def generate_all_drafts(
    committee:      list[Stakeholder],
    company:        CompanyProfile,
    account_brief:  str,
    your_product:   str,
    sender_name:    str,
    sender_company: str,
) -> list[OutreachDraft]:
    """Generate drafts for the top 3 stakeholders in parallel."""
    import asyncio
    top_3 = committee[:3]
    tasks = [
        generate_outreach_draft(s, company, account_brief, your_product, sender_name, sender_company)
        for s in top_3
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if isinstance(r, OutreachDraft)]

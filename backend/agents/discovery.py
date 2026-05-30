"""
Agent 1: Discovery Agent
Finds net-new ICP-matching companies from the live web.
No static list — pulls from job boards, funding news, and SERP.
"""
from __future__ import annotations
import asyncio
from models import CompanyProfile, IntentSignal
from brightdata_client import serp_search, search_company_news, scrape_job_postings
from demo_data import fallback_company, BRIGHTDATA_SETUP_HINT


ICP_SIGNALS = [
    # (search template, signal_type, confidence)
    ('"{company}" "series A" OR "series B" OR "raised" 2025 OR 2026', "funding", 0.85),
    ('"{company}" hiring "head of sales" OR "VP of sales" OR "SDR" 2026', "hiring_spike", 0.75),
    ('"{company}" "revenue operations" OR "RevOps" job 2026', "hiring_spike", 0.70),
]


async def discover_companies(icp_description: str, seed_names: list[str] = []) -> tuple[list[CompanyProfile], str | None]:
    """
    Two modes:
    1. Seed names provided — enrich those specific companies.
    2. No seeds — discover net-new via ICP-based SERP queries.
    """
    profiles: list[CompanyProfile] = []
    used_fallback = False

    if seed_names:
        results = await asyncio.gather(*[_enrich_company(name) for name in seed_names])
        for name, profile in zip(seed_names, results):
            if profile is None:
                profiles.append(fallback_company(name))
                used_fallback = True
            else:
                profiles.append(profile)
    else:
        profiles = await _discover_from_icp(icp_description)
        if not profiles:
            profiles = [fallback_company(n) for n in ["Notion", "Linear", "Retool"]]
            used_fallback = True

    warning = None
    if used_fallback:
        warning = f"Used demo enrichment (Bright Data unavailable). {BRIGHTDATA_SETUP_HINT}"

    return profiles, warning


async def _discover_from_icp(icp_description: str) -> list[CompanyProfile]:
    """
    Search the web for companies matching the ICP description.
    Returns up to 10 discovered companies.
    """
    # Distil the ICP into a search query
    query   = f"B2B SaaS company {icp_description} hiring OR funding 2026"
    results = await serp_search(query, num=15)

    # Extract company names from SERP snippets
    seen, profiles = set(), []
    for r in results:
        name = _extract_company_name(r["title"], r["snippet"])
        if name and name not in seen:
            seen.add(name)
            profile = await _enrich_company(name, source_url=r["url"])
            if profile:
                profiles.append(profile)
        if len(profiles) >= 8:
            break

    return profiles


async def _enrich_company(name: str, source_url: str = "") -> CompanyProfile | None:
    """Build a CompanyProfile from live web data."""
    try:
        # Parallel fetch: news + job postings
        news_task = search_company_news(name)
        jobs_task = scrape_job_postings(name, limit=5)
        news, jobs = await asyncio.gather(news_task, jobs_task)

        # Derive domain from SERP results
        domain = _guess_domain(name, news + jobs)

        # Detect funding from news snippets
        funding = _extract_funding(news)

        # Detect headcount from job count (proxy signal)
        headcount_estimate = _estimate_headcount(jobs)

        # ICP score: simple heuristic for hackathon
        icp_score = _compute_icp_score(funding, jobs, headcount_estimate)

        return CompanyProfile(
            name=name,
            domain=domain,
            description=news[0]["snippet"] if news else "",
            headcount=headcount_estimate,
            funding=funding,
            industry="B2B SaaS",
            source_url=source_url or (news[0]["url"] if news else ""),
            icp_score=icp_score,
        )
    except Exception as e:
        print(f"[Discovery] Failed to enrich {name}: {e}")
        return None


def _extract_company_name(title: str, snippet: str) -> str:
    """Naive company name extraction from SERP title."""
    parts = title.split("|")
    if parts:
        return parts[-1].strip()[:60]
    return ""


def _guess_domain(name: str, results: list[dict]) -> str:
    for r in results:
        url = r.get("url", "")
        if url and "linkedin" not in url and "reddit" not in url:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            if parsed.netloc:
                return parsed.netloc.replace("www.", "")
    slug = name.lower().replace(" ", "").replace(",", "")[:20]
    return f"{slug}.com"


def _extract_funding(news: list[dict]) -> str | None:
    keywords = ["series a", "series b", "series c", "seed", "raised", "funding"]
    for item in news:
        text = (item.get("title", "") + " " + item.get("snippet", "")).lower()
        for kw in keywords:
            if kw in text:
                # Try to find dollar amount
                import re
                match = re.search(r"\$[\d.,]+[mMbB]", text)
                return match.group(0) if match else kw.title()
    return None


def _estimate_headcount(jobs: list[dict]) -> int | None:
    if len(jobs) >= 8:
        return 150    # lots of hiring → mid-size
    elif len(jobs) >= 3:
        return 60
    elif len(jobs) >= 1:
        return 25
    return None


def _compute_icp_score(funding: str | None, jobs: list[dict], headcount: int | None) -> float:
    score = 0.3   # base
    if funding:
        score += 0.3
    if jobs and any("sales" in j.get("title", "").lower() or "revenue" in j.get("snippet", "").lower() for j in jobs):
        score += 0.25
    if headcount and 20 <= headcount <= 300:
        score += 0.15
    return min(score, 1.0)

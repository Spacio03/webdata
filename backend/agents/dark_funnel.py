"""
Agent 2: Dark Funnel Agent
Detects anonymous buyer intent BEFORE it appears in any intent vendor's feed.
Sources: Reddit, G2/Capterra reviews, job postings that reveal tool evaluations,
LinkedIn discussions, and forum activity — all via Bright Data.
"""
import asyncio
from models import IntentSignal, CompanyProfile
from brightdata_client import scrape_reddit, scrape_g2_reviews, scrape_job_postings, serp_search
from demo_data import fallback_signals

# Subreddits where buyers discuss GTM pain
RELEVANT_SUBREDDITS = ["sales", "saastr", "startups", "entrepreneur", "salestips", "b2b"]

# Keywords that reveal active tool evaluation
EVAL_KEYWORDS = [
    "looking for a tool", "recommend a tool", "alternatives to", "vs ",
    "we're evaluating", "replacing our", "switching from", "outreach alternative",
    "apollo alternative", "hubspot alternative", "best crm", "sales automation",
    "reactivate leads", "dormant leads", "lead enrichment",
]

PAIN_KEYWORDS = [
    "leads going cold", "manual follow up", "reps don't have time",
    "pipeline stalled", "no visibility", "chasing leads", "SDR productivity",
    "outreach not working", "reply rate", "email open rate",
]


async def detect_dark_funnel_signals(company: CompanyProfile, product_category: str = "sales automation") -> list[IntentSignal]:
    """
    Runs 4 parallel dark funnel detectors for a company.
    Returns a ranked list of IntentSignal objects.
    """
    tasks = [
        _reddit_signals(company.name, product_category),
        _job_posting_signals(company.name),
        _g2_activity_signals(product_category),
        _serp_intent_signals(company.name, product_category),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    signals: list[IntentSignal] = []
    for result in results:
        if isinstance(result, list):
            signals.extend(result)

    # Deduplicate and sort by confidence
    seen, unique = set(), []
    for s in sorted(signals, key=lambda x: x.confidence, reverse=True):
        if s.evidence not in seen:
            seen.add(s.evidence)
            unique.append(s)

    return unique[:8] if unique else fallback_signals(company)


async def _reddit_signals(company_name: str, product_category: str) -> list[IntentSignal]:
    signals = []
    for subreddit in RELEVANT_SUBREDDITS[:3]:
        query = f"{product_category} tool recommendation"
        posts = await scrape_reddit(subreddit, query, limit=5)
        for post in posts:
            text = (post["title"] + " " + post["body"]).lower()
            if any(kw in text for kw in EVAL_KEYWORDS + PAIN_KEYWORDS):
                signals.append(IntentSignal(
                    signal_type="dark_funnel",
                    source="reddit",
                    evidence=f"{post['title']} — {post['body'][:200]}",
                    source_url=post["url"],
                    confidence=0.65 + min(post.get("score", 0) / 1000, 0.2),
                ))
    return signals


async def _job_posting_signals(company_name: str) -> list[IntentSignal]:
    """
    A company posting for 'Sales Ops to evaluate and implement revenue tools'
    is an active buyer signal. Bright Data Web Scraper API finds these.
    """
    jobs  = await scrape_job_postings(company_name, limit=8)
    signals = []
    eval_role_keywords = [
        "evaluate", "implement", "select", "manage vendors",
        "revenue operations", "revops", "sales stack", "crm admin",
        "sales enablement", "outreach", "salesloft", "apollo",
    ]
    for job in jobs:
        combined = (job["title"] + " " + job["snippet"]).lower()
        if any(kw in combined for kw in eval_role_keywords):
            signals.append(IntentSignal(
                signal_type="job_posting",
                source="linkedin",
                evidence=f"Hiring: {job['title']} — {job['snippet'][:200]}",
                source_url=job["url"],
                confidence=0.78,
            ))
    return signals


async def _g2_activity_signals(product_category: str) -> list[IntentSignal]:
    """
    Companies whose employees are actively reviewing competitors on G2
    are in active evaluation mode.
    """
    reviews = await scrape_g2_reviews(product_category, limit=5)
    signals = []
    negative_keywords = ["disappointed", "switching", "looking for", "lacks", "missing", "too expensive", "poor support"]
    for review in reviews:
        text = review["text"].lower()
        if any(kw in text for kw in negative_keywords):
            signals.append(IntentSignal(
                signal_type="review_activity",
                source="g2",
                evidence=f"Competitor G2 complaint: {review['text'][:250]}",
                source_url=review["source"],
                confidence=0.72,
            ))
    return signals


async def _serp_intent_signals(company_name: str, product_category: str) -> list[IntentSignal]:
    """
    Search for the company discussing evaluation or pain on the open web.
    """
    queries = [
        f'"{company_name}" "{product_category}" evaluation OR "looking for" OR alternatives',
        f'"{company_name}" sales automation OR CRM problem OR "SDR productivity"',
    ]
    signals = []
    for query in queries:
        results = await serp_search(query, num=5)
        for r in results:
            combined = (r["title"] + " " + r["snippet"]).lower()
            if any(kw in combined for kw in PAIN_KEYWORDS + EVAL_KEYWORDS):
                signals.append(IntentSignal(
                    signal_type="dark_funnel",
                    source="serp",
                    evidence=f"{r['title']}: {r['snippet'][:200]}",
                    source_url=r["url"],
                    confidence=0.60,
                ))
    return signals

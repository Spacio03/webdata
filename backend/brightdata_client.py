"""
Bright Data client — wraps SERP API, Web Unlocker, and Web Scraper API.
Uses Bright Data's REST API (Bearer token) as the primary method.

When DEMO_MODE=true in .env, all live scraping is bypassed and cached
demo payloads are returned instead — scoring, memory, and alerts still run.
"""
import os, httpx, urllib.parse
from bs4 import BeautifulSoup
from typing import Any

API_KEY       = os.getenv("BRIGHTDATA_API_KEY", "")
API_BASE      = "https://api.brightdata.com"
SERP_ZONE     = os.getenv("BRIGHTDATA_SERP_ZONE", "serp")
UNLOCKER_ZONE = os.getenv("BRIGHTDATA_UNLOCKER_ZONE", "web_unlocker")
DEMO_MODE     = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")

_HEADERS = lambda: {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}


async def _bd_request(zone: str, url: str, format: str = "json") -> httpx.Response:
    """
    Core Bright Data API request.
    POST to /request with zone + target URL — handles bot protection, geo-blocks, JS rendering.
    Docs: https://docs.brightdata.com/scraping-automation/web-unlocker/introduction
    """
    if not API_KEY:
        raise ValueError("BRIGHTDATA_API_KEY is not set in .env")

    async with httpx.AsyncClient(timeout=45) as client:
        resp = await client.post(
            f"{API_BASE}/request",
            headers=_HEADERS(),
            json={"zone": zone, "url": url, "format": format},
        )
    if resp.status_code == 400 and "zone" in resp.text.lower():
        raise ValueError(
            f'Bright Data zone "{zone}" not found. '
            f"Update BRIGHTDATA_SERP_ZONE / BRIGHTDATA_UNLOCKER_ZONE in .env with names from your Bright Data dashboard."
        )
    resp.raise_for_status()
    return resp


# ── SERP API ─────────────────────────────────────────────────────────────────

async def serp_search(query: str, num: int = 10) -> list[dict]:
    """
    Search Google via Bright Data SERP API (API key auth).
    Returns list of {title, url, snippet} dicts.
    In DEMO_MODE, returns cached payloads keyed by company name in the query.
    """
    if DEMO_MODE:
        from demo_data import get_demo_serp
        # Extract company name hint from query (best-effort)
        for name in ["notion", "linear", "retool", "rippling", "apollo"]:
            if name in query.lower():
                return get_demo_serp(name)
        return get_demo_serp("generic")

    encoded    = urllib.parse.quote_plus(query)
    search_url = f"https://www.google.com/search?q={encoded}&num={num}&brd_json=1"

    resp = await _bd_request(zone=SERP_ZONE, url=search_url, format="json")

    # Bright Data returns structured JSON when brd_json=1
    try:
        data    = resp.json()
        organic = data.get("organic", [])
        if organic:
            return [
                {"title": r.get("title", ""), "url": r.get("link", ""), "snippet": r.get("snippet", "")}
                for r in organic
            ]
    except Exception:
        pass

    # Fallback: parse HTML
    soup    = BeautifulSoup(resp.text, "html.parser")
    results = []
    for g in soup.select("div.g")[:num]:
        a       = g.select_one("a")
        h3      = g.select_one("h3")
        snippet = g.select_one("div.VwiC3b")
        if a and h3:
            results.append({
                "title":   h3.get_text(strip=True),
                "url":     a.get("href", ""),
                "snippet": snippet.get_text(strip=True) if snippet else "",
            })
    return results


# ── Web Unlocker — fetch any URL ──────────────────────────────────────────────

async def fetch_url(url: str) -> str:
    """
    Fetch any public URL via Bright Data Web Unlocker (API key auth).
    Bypasses CAPTCHAs, bot detection, geo-blocks, and JS rendering.
    Docs: https://docs.brightdata.com/scraping-automation/web-unlocker/introduction
    """
    resp = await _bd_request(zone=UNLOCKER_ZONE, url=url, format="raw")
    return resp.text


# ── LinkedIn company scraper ──────────────────────────────────────────────────

async def scrape_linkedin_company(company_name: str) -> dict[str, Any]:
    """
    Scrape a LinkedIn company page for headcount, description, and recent posts.
    Uses Web Unlocker zone to bypass LinkedIn's bot protection.
    """
    query   = f"site:linkedin.com/company {company_name}"
    results = await serp_search(query, num=3)

    linkedin_url = next(
        (r["url"] for r in results if "linkedin.com/company" in r["url"]),
        None,
    )
    if not linkedin_url:
        return {"name": company_name, "linkedin_url": "", "headcount": None, "description": ""}

    html = await fetch_url(linkedin_url)
    soup = BeautifulSoup(html, "html.parser")

    description = ""
    for tag in soup.select("p.break-words, section.summary p, .org-page-details__definition"):
        text = tag.get_text(strip=True)
        if len(text) > 30:
            description = text
            break

    return {
        "name":         company_name,
        "linkedin_url": linkedin_url,
        "description":  description[:500],
        "headcount":    None,   # Parse from page if available
    }


# ── Job posting scraper ───────────────────────────────────────────────────────

async def scrape_job_postings(company_name: str, limit: int = 10) -> list[dict]:
    """
    Find recent job postings for a company via SERP.
    In DEMO_MODE, returns cached job payloads.
    """
    if DEMO_MODE:
        from demo_data import get_demo_jobs
        return get_demo_jobs(company_name)

    query   = f'"{company_name}" jobs hiring site:linkedin.com OR site:greenhouse.io OR site:lever.co'
    results = await serp_search(query, num=limit)
    return [
        {"title": r["title"], "url": r["url"], "snippet": r["snippet"]}
        for r in results
    ]


# ── G2 review scraper ─────────────────────────────────────────────────────────

async def scrape_g2_reviews(product_name: str, limit: int = 5) -> list[dict]:
    """
    Scrape recent G2 reviews for a competitor product.
    Negative reviews reveal pain points we can exploit.
    """
    query   = f'site:g2.com "{product_name}" reviews'
    results = await serp_search(query, num=limit)

    reviews = []
    for r in results[:3]:
        if "g2.com" not in r["url"]:
            continue
        try:
            html = await fetch_url(r["url"])
            soup = BeautifulSoup(html, "html.parser")
            for review_el in soup.select(".paper--white p, [itemprop='reviewBody']")[:3]:
                text = review_el.get_text(strip=True)
                if len(text) > 40:
                    reviews.append({"source": r["url"], "text": text[:300]})
        except Exception:
            continue
    return reviews


# ── Reddit intent scraper ─────────────────────────────────────────────────────

async def scrape_reddit(subreddit: str, query: str, limit: int = 5) -> list[dict]:
    """
    Search Reddit for discussions about a problem/topic.
    Dark funnel: buyers discussing pain before they ever talk to a vendor.
    """
    search_url = f"https://www.reddit.com/r/{subreddit}/search.json?q={query}&sort=new&limit={limit}"
    try:
        html = await fetch_url(search_url)
        import json
        data  = json.loads(html)
        posts = data.get("data", {}).get("children", [])
        return [
            {
                "title":  p["data"].get("title", ""),
                "url":    f"https://reddit.com{p['data'].get('permalink', '')}",
                "body":   p["data"].get("selftext", "")[:300],
                "score":  p["data"].get("score", 0),
            }
            for p in posts
        ]
    except Exception:
        # Fallback: SERP search Reddit
        results = await serp_search(f"site:reddit.com {query}", num=limit)
        return [{"title": r["title"], "url": r["url"], "body": r["snippet"], "score": 0} for r in results]


# ── News / funding search ─────────────────────────────────────────────────────

async def search_company_news(company_name: str) -> list[dict]:
    """Search for recent news: funding rounds, leadership changes, product launches."""
    query   = f'"{company_name}" (funding OR "series A" OR "series B" OR "raised" OR "acquired" OR "launched") 2025 OR 2026'
    results = await serp_search(query, num=8)
    return results

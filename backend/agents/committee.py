"""
Agent 4: Buying Committee Mapper
Maps every stakeholder at a target account from public web data.
Predicts each person's role in the deal (champion, blocker, economic buyer, etc.)
and generates personalised hooks for outreach.
"""
from __future__ import annotations
import asyncio
from models import CompanyProfile, Stakeholder
from brightdata_client import serp_search, fetch_url
from demo_data import fallback_committee
from bs4 import BeautifulSoup

# Titles that indicate buying committee membership
BUYER_TITLES = {
    "champion": [
        "head of sales", "vp of sales", "director of sales", "sales manager",
        "revenue operations", "revops", "sales operations", "sales enablement",
        "head of growth", "growth",
    ],
    "economic_buyer": [
        "ceo", "coo", "cfo", "chief executive", "chief operating",
        "chief financial", "founder", "co-founder", "president",
    ],
    "technical_evaluator": [
        "cto", "chief technology", "vp engineering", "head of engineering",
        "it manager", "systems", "solutions architect", "data",
    ],
    "user_buyer": [
        "account executive", "ae", "sdr", "bdr", "sales development",
        "business development", "account manager",
    ],
    "blocker": [
        "procurement", "legal", "compliance", "security", "finance manager",
    ],
}

PRIORITY_ORDER = ["champion", "economic_buyer", "technical_evaluator", "user_buyer", "blocker"]


async def map_buying_committee(company: CompanyProfile, limit: int = 5) -> list[Stakeholder]:
    """
    Find relevant people at the company from SERP + LinkedIn, classify their deal role,
    and generate a personalised outreach hook for each.
    """
    try:
        raw_people = await _find_people(company.name)
    except Exception as e:
        print(f"[Committee] Skipping live lookup for {company.name}: {e}")
        raw_people = []
    committee:  list[Stakeholder] = []
    seen_names: set[str] = set()

    for person in raw_people:
        name  = person.get("name", "").strip()
        title = person.get("title", "").strip()
        if not name or name in seen_names:
            continue
        seen_names.add(name)

        role     = _classify_role(title)
        priority = PRIORITY_ORDER.index(role) + 1 if role in PRIORITY_ORDER else len(PRIORITY_ORDER)
        hook     = _generate_hook(role, title, company)

        committee.append(Stakeholder(
            name=name,
            title=title,
            linkedin_url=person.get("linkedin_url", ""),
            role_in_deal=role,
            priority=priority,
            background=person.get("background", ""),
            hook=hook,
        ))

    # Sort by priority (champion first)
    committee.sort(key=lambda s: s.priority)
    if not committee:
        return fallback_committee(company)
    return committee[:limit]


async def _find_people(company_name: str) -> list[dict]:
    """Search LinkedIn and SERP for key people at the company."""
    people = []

    # 1. SERP-based LinkedIn people search
    for title_group in ["VP Sales OR Head of Sales OR RevOps", "CEO OR Founder OR CTO"]:
        query   = f'site:linkedin.com/in "{company_name}" {title_group}'
        try:
            results = await serp_search(query, num=6)
        except Exception:
            continue

        for r in results:
            parsed = _parse_linkedin_result(r["title"], r["snippet"], r["url"])
            if parsed:
                people.append(parsed)

    # 2. Company about/team page scrape (bonus: catches non-LinkedIn profiles)
    team_page = await _scrape_team_page(company_name)
    people.extend(team_page)

    return people


def _parse_linkedin_result(title: str, snippet: str, url: str) -> dict | None:
    """Parse a LinkedIn SERP result into a person dict."""
    if "linkedin.com/in/" not in url:
        return None

    # LinkedIn SERP title format: "Name - Title at Company | LinkedIn"
    parts = title.replace(" | LinkedIn", "").split(" - ")
    if len(parts) < 2:
        return None

    name  = parts[0].strip()
    rest  = parts[1].strip()   # "Title at Company" or just "Title"
    title = rest.split(" at ")[0].strip() if " at " in rest else rest.strip()

    return {
        "name":         name,
        "title":        title,
        "linkedin_url": url,
        "background":   snippet[:200],
    }


async def _scrape_team_page(company_name: str) -> list[dict]:
    """Try to scrape a /team or /about page for leadership info."""
    try:
        query   = f'"{company_name}" leadership team site:{_guess_domain(company_name)}'
        results = await serp_search(query, num=3)
    except Exception:
        return []
    people  = []

    for r in results:
        if "linkedin" in r["url"] or "crunchbase" in r["url"]:
            continue
        try:
            html = await fetch_url(r["url"])
            soup = BeautifulSoup(html, "html.parser")
            # Generic team card selectors
            for card in soup.select(".team-member, .person-card, [class*='team'], [class*='leadership']")[:6]:
                name_el  = card.select_one("h3, h4, strong, .name")
                title_el = card.select_one("p, span, .title, .role")
                if name_el and title_el:
                    people.append({
                        "name":  name_el.get_text(strip=True)[:60],
                        "title": title_el.get_text(strip=True)[:80],
                        "linkedin_url": "",
                        "background": "",
                    })
        except Exception:
            continue

    return people


def _classify_role(title: str) -> str:
    lower = title.lower()
    for role, keywords in BUYER_TITLES.items():
        if any(kw in lower for kw in keywords):
            return role
    return "user_buyer"


def _generate_hook(role: str, title: str, company: CompanyProfile) -> str:
    hooks = {
        "champion": (
            f"As {title}, you're likely the one responsible for hitting pipeline numbers. "
            f"MOSAIC gives your team live buying signals before anyone else sees them."
        ),
        "economic_buyer": (
            f"MOSAIC pays for itself in the first reactivated deal. "
            f"We can show you the ROI model in 15 minutes."
        ),
        "technical_evaluator": (
            f"MOSAIC runs on FastAPI + PostgreSQL, deploys to Railway in one command, "
            f"and connects to your HubSpot via OAuth — no custom integration needed."
        ),
        "user_buyer": (
            f"Instead of manual research before every call, MOSAIC surfaces a 60-second "
            f"account brief and a drafted email — so you spend time selling, not digging."
        ),
        "blocker": (
            f"MOSAIC is SOC 2 compliant (in progress), stores no PII beyond what's in your CRM, "
            f"and processes only publicly available web data."
        ),
    }
    return hooks.get(role, f"We'd love to show you what MOSAIC can do for {company.name}.")


def _guess_domain(company_name: str) -> str:
    return company_name.lower().replace(" ", "").replace(",", "")[:20] + ".com"

"""
Fallback / demo-mode data.

When DEMO_MODE=true (or Bright Data is unavailable), the pipeline uses these
cached payloads instead of live scraping. Scoring, memory, and alerts still
run normally — only the data collection step is replaced.
"""
from __future__ import annotations
from datetime import datetime, timedelta
from models import (
    CompanyProfile, IntentSignal, Stakeholder,
    BuyingWindowPrediction, OutreachDraft,
)

BRIGHTDATA_SETUP_HINT = (
    'Bright Data zone not found. Set BRIGHTDATA_SERP_ZONE and BRIGHTDATA_UNLOCKER_ZONE '
    'in .env to your zone names from brightdata.com/cp/zones'
)

# ── Rich company profiles ─────────────────────────────────────────────────────

KNOWN_COMPANIES: dict[str, dict] = {
    "notion": {
        "domain": "notion.so",
        "description": "All-in-one workspace for notes, docs, and project management. 500+ employees, Series C.",
        "headcount": 500,
        "funding": "$275M Series C",
        "industry": "B2B SaaS",
        "icp_score": 0.82,
    },
    "linear": {
        "domain": "linear.app",
        "description": "Issue tracking and product development for high-performance teams. 120 employees, Series B.",
        "headcount": 120,
        "funding": "$35M Series B",
        "industry": "B2B SaaS",
        "icp_score": 0.78,
    },
    "retool": {
        "domain": "retool.com",
        "description": "Low-code platform for building internal tools quickly. 450 employees, Series C.",
        "headcount": 450,
        "funding": "$45M Series C",
        "industry": "B2B SaaS",
        "icp_score": 0.75,
    },
    "rippling": {
        "domain": "rippling.com",
        "description": "HR, IT, and Finance platform for growing businesses. 2000+ employees, Series F.",
        "headcount": 2000,
        "funding": "$500M Series F",
        "industry": "B2B SaaS",
        "icp_score": 0.88,
    },
    "apollo": {
        "domain": "apollo.io",
        "description": "Sales intelligence and engagement platform. 500+ employees, Series D.",
        "headcount": 500,
        "funding": "$100M Series D",
        "industry": "Sales Tech",
        "icp_score": 0.91,
    },
}

# ── Rich signal sets per company ──────────────────────────────────────────────

KNOWN_SIGNALS: dict[str, list[dict]] = {
    "notion": [
        {
            "signal_type": "hiring_spike",
            "source": "Greenhouse",
            "evidence": "Notion is hiring 5 Enterprise Account Executives and 3 SDR roles — all posted in the last 14 days.",
            "source_url": "https://boards.greenhouse.io/notion",
            "confidence": 0.88,
            "ai_interpretation": "GTM expansion — budget and tooling decisions follow within 30–90 days.",
            "score_impact": 12.0,
        },
        {
            "signal_type": "job_posting",
            "source": "LinkedIn",
            "evidence": "Head of Revenue Operations role posted — JD mentions 'evaluate and implement sales engagement tools'.",
            "source_url": "https://linkedin.com/jobs/notion-revops",
            "confidence": 0.92,
            "ai_interpretation": "RevOps hire signals active vendor evaluation of the entire sales stack.",
            "score_impact": 15.0,
        },
        {
            "signal_type": "dark_funnel",
            "source": "Reddit",
            "evidence": "r/sales thread: 'Anyone at Notion using Outreach? We're evaluating alternatives — Apollo feels bloated for our team size.'",
            "source_url": "https://reddit.com/r/sales/notion-outreach",
            "confidence": 0.74,
            "ai_interpretation": "Active competitor evaluation — buyer is in research mode right now.",
            "score_impact": 8.5,
        },
        {
            "signal_type": "funding",
            "source": "TechCrunch",
            "evidence": "Notion raises $275M Series C at $10B valuation — CEO states 'doubling down on enterprise GTM'.",
            "source_url": "https://techcrunch.com/notion-series-c",
            "confidence": 0.95,
            "ai_interpretation": "Fresh capital means new budget cycles and a mandate to build out the GTM stack.",
            "score_impact": 18.0,
        },
    ],
    "linear": [
        {
            "signal_type": "hiring_spike",
            "source": "Lever",
            "evidence": "Linear posted VP of Sales and 4 AE roles in the past 3 weeks — first sales hires in 18 months.",
            "source_url": "https://jobs.lever.co/linear",
            "confidence": 0.91,
            "ai_interpretation": "First sales team build-out — they need the full GTM stack from scratch.",
            "score_impact": 16.0,
        },
        {
            "signal_type": "review_activity",
            "source": "G2",
            "evidence": "G2 review of Salesforce by Linear employee: 'Too complex for our team size, looking for something lighter.'",
            "source_url": "https://g2.com/products/salesforce/reviews",
            "confidence": 0.79,
            "ai_interpretation": "Dissatisfaction with current CRM — actively evaluating alternatives.",
            "score_impact": 9.0,
        },
        {
            "signal_type": "dark_funnel",
            "source": "SERP",
            "evidence": "Linear blog post: 'How we think about our sales motion in 2026' — mentions evaluating intent data tools.",
            "source_url": "https://linear.app/blog/sales-motion-2026",
            "confidence": 0.83,
            "ai_interpretation": "Public signal of active GTM strategy shift — high receptivity to new tools.",
            "score_impact": 11.0,
        },
    ],
    "retool": [
        {
            "signal_type": "funding",
            "source": "Crunchbase",
            "evidence": "Retool closes $45M Series C — press release mentions 'expanding enterprise sales team by 3x'.",
            "source_url": "https://crunchbase.com/retool-series-c",
            "confidence": 0.93,
            "ai_interpretation": "3x sales team expansion requires new tooling infrastructure immediately.",
            "score_impact": 17.0,
        },
        {
            "signal_type": "job_posting",
            "source": "Greenhouse",
            "evidence": "Retool hiring Sales Enablement Manager — JD: 'own our sales tech stack including CRM, sequencing, and intent data'.",
            "source_url": "https://boards.greenhouse.io/retool/sales-enablement",
            "confidence": 0.89,
            "ai_interpretation": "Explicit intent data mention in JD — they are actively evaluating vendors.",
            "score_impact": 14.0,
        },
    ],
}

# ── Buying committee per company ──────────────────────────────────────────────

KNOWN_COMMITTEE: dict[str, list[dict]] = {
    "notion": [
        {"name": "Olivia Nottebohm", "title": "Head of Sales", "role_in_deal": "champion", "priority": 1,
         "linkedin_url": "https://linkedin.com/in/olivia-nottebohm", "hook": "You're scaling from 5 to 15 AEs — RevRadar gives each rep a pre-researched brief before every call."},
        {"name": "Akshay Kothari", "title": "COO", "role_in_deal": "economic_buyer", "priority": 2,
         "linkedin_url": "https://linkedin.com/in/akshay-kothari", "hook": "RevRadar pays for itself in the first reactivated deal. ROI model in 15 minutes."},
        {"name": "Simon Last", "title": "Head of RevOps", "role_in_deal": "technical_evaluator", "priority": 3,
         "linkedin_url": "https://linkedin.com/in/simon-last", "hook": "Deploys in one afternoon, connects to HubSpot via OAuth — no custom integration needed."},
    ],
    "linear": [
        {"name": "Nan Yu", "title": "Head of Operations", "role_in_deal": "champion", "priority": 1,
         "linkedin_url": "https://linkedin.com/in/nan-yu", "hook": "As you build Linear's first sales team, RevRadar surfaces which accounts are ready to buy before your reps even reach out."},
        {"name": "Karri Saarinen", "title": "CEO & Co-founder", "role_in_deal": "economic_buyer", "priority": 2,
         "linkedin_url": "https://linkedin.com/in/karri-saarinen", "hook": "RevRadar gives your new sales team an unfair advantage — live intent data before any vendor feed."},
    ],
    "retool": [
        {"name": "Jamie Cuffe", "title": "VP Sales", "role_in_deal": "champion", "priority": 1,
         "linkedin_url": "https://linkedin.com/in/jamie-cuffe", "hook": "With 3x headcount growth planned, RevRadar ensures every new AE hits the ground running with pre-scored accounts."},
        {"name": "David Hsu", "title": "CEO & Co-founder", "role_in_deal": "economic_buyer", "priority": 2,
         "linkedin_url": "https://linkedin.com/in/david-hsu", "hook": "RevRadar pays for itself in the first reactivated deal. ROI model in 15 minutes."},
    ],
}

# ── Demo SERP / scraping payloads (used by brightdata_client in DEMO_MODE) ───

DEMO_SERP_RESULTS: dict[str, list[dict]] = {
    "notion": [
        {"title": "Notion raises $275M Series C | TechCrunch", "url": "https://techcrunch.com/notion-series-c", "snippet": "Notion closes $275M at $10B valuation, CEO says doubling down on enterprise GTM."},
        {"title": "Notion hiring Enterprise AE | Greenhouse", "url": "https://boards.greenhouse.io/notion", "snippet": "5 Enterprise Account Executive roles posted in the last 14 days."},
    ],
    "linear": [
        {"title": "Linear hiring VP Sales | Lever", "url": "https://jobs.lever.co/linear", "snippet": "Linear's first VP of Sales hire — 4 AE roles also posted."},
        {"title": "Linear blog: sales motion 2026", "url": "https://linear.app/blog/sales-motion-2026", "snippet": "How we think about our sales motion — evaluating intent data tools."},
    ],
    "retool": [
        {"title": "Retool closes $45M Series C | Crunchbase", "url": "https://crunchbase.com/retool-series-c", "snippet": "Retool expands enterprise sales team by 3x after Series C close."},
        {"title": "Retool Sales Enablement Manager | Greenhouse", "url": "https://boards.greenhouse.io/retool/sales-enablement", "snippet": "Own our sales tech stack including CRM, sequencing, and intent data."},
    ],
}

DEMO_JOB_RESULTS: dict[str, list[dict]] = {
    "notion": [
        {"title": "Enterprise Account Executive", "url": "https://boards.greenhouse.io/notion/ae", "snippet": "Own the full sales cycle for enterprise accounts. 5 roles open."},
        {"title": "Head of Revenue Operations", "url": "https://boards.greenhouse.io/notion/revops", "snippet": "Evaluate and implement sales engagement tools. Own the sales tech stack."},
        {"title": "Sales Development Representative", "url": "https://boards.greenhouse.io/notion/sdr", "snippet": "3 SDR roles — outbound focus, Outreach or Apollo experience preferred."},
    ],
    "linear": [
        {"title": "VP of Sales", "url": "https://jobs.lever.co/linear/vp-sales", "snippet": "First sales leadership hire. Build the GTM motion from scratch."},
        {"title": "Account Executive", "url": "https://jobs.lever.co/linear/ae", "snippet": "4 AE roles — mid-market focus, experience with PLG-to-sales motion preferred."},
    ],
    "retool": [
        {"title": "Sales Enablement Manager", "url": "https://boards.greenhouse.io/retool/sales-enablement", "snippet": "Own sales tech stack: CRM, sequencing, intent data. Evaluate new vendors."},
        {"title": "Enterprise Account Executive", "url": "https://boards.greenhouse.io/retool/enterprise-ae", "snippet": "3 enterprise AE roles as part of 3x headcount expansion."},
    ],
}


# ── Helper functions ──────────────────────────────────────────────────────────

def fallback_company(name: str) -> CompanyProfile:
    key   = name.lower().strip()
    known = KNOWN_COMPANIES.get(key, {})
    slug  = key.replace(" ", "").replace(",", "")[:20]
    return CompanyProfile(
        name=name,
        domain=known.get("domain", f"{slug}.com"),
        description=known.get("description", f"{name} — B2B SaaS company matching your ICP."),
        headcount=known.get("headcount", 80),
        funding=known.get("funding"),
        industry=known.get("industry", "B2B SaaS"),
        source_url=f"https://{known.get('domain', slug + '.com')}",
        icp_score=known.get("icp_score", 0.55),
    )


def fallback_signals(company: CompanyProfile) -> list[IntentSignal]:
    key     = company.name.lower().strip()
    raw     = KNOWN_SIGNALS.get(key, [])
    if raw:
        return [IntentSignal(**s) for s in raw]
    # Generic fallback
    return [
        IntentSignal(
            signal_type="hiring_spike",
            source="Greenhouse",
            evidence=f"{company.name} is hiring RevOps and SDR roles — typical pre-tooling evaluation signal.",
            source_url=company.source_url,
            confidence=0.74,
            ai_interpretation="GTM expansion — budget and tooling decisions follow within 30–90 days.",
            score_impact=10.0,
        ),
        IntentSignal(
            signal_type="dark_funnel",
            source="Reddit",
            evidence=f"Reddit r/sales thread mentions {company.name}'s team evaluating sales automation alternatives.",
            source_url="https://reddit.com/r/sales",
            confidence=0.68,
            ai_interpretation="Buyers are actively researching solutions — they're in evaluation mode right now.",
            score_impact=8.0,
        ),
        IntentSignal(
            signal_type="funding",
            source="TechCrunch",
            evidence=f"{company.name} raised growth capital in the last 18 months — GTM budget likely expanding.",
            source_url=company.source_url,
            confidence=0.71,
            ai_interpretation="Fresh capital means new budget cycles and a mandate to build out the GTM stack.",
            score_impact=12.0,
        ),
    ]


def fallback_committee(company: CompanyProfile) -> list[Stakeholder]:
    key  = company.name.lower().strip()
    rows = KNOWN_COMMITTEE.get(key, [
        {"name": "Alex Morgan", "title": "VP Sales", "role_in_deal": "champion", "priority": 1,
         "linkedin_url": "", "hook": f"Teams like {company.name} use live buying signals to prioritize outbound — worth a 15-min look?"},
        {"name": "Jordan Lee", "title": "CEO", "role_in_deal": "economic_buyer", "priority": 2,
         "linkedin_url": "", "hook": "RevRadar pays for itself in the first reactivated deal."},
    ])
    return [
        Stakeholder(
            name=r["name"],
            title=r["title"],
            role_in_deal=r["role_in_deal"],
            priority=r["priority"],
            hook=r.get("hook", f"Teams like {company.name} use live buying signals to prioritize outbound."),
            linkedin_url=r.get("linkedin_url", ""),
        )
        for r in rows
    ]


def fallback_brief(
    company: CompanyProfile,
    signals: list[IntentSignal],
    buying_window: BuyingWindowPrediction | None,
    your_product: str,
) -> str:
    top_signal = signals[0].evidence if signals else "Multiple GTM motion signals detected."
    window = (
        f"{buying_window.pattern_label} (~{buying_window.days_to_window} days)."
        if buying_window else "Signals suggest active evaluation in the next 30–60 days."
    )
    return (
        f"**Why this account:** {company.name} ({company.domain}) fits your ICP — "
        f"{company.description or 'B2B SaaS with growing GTM team'}. "
        f"Funding: {company.funding or 'growth-stage'}.\n\n"
        f"**Why now:** {top_signal}\n\n"
        f"**Recommended angle:** Position {your_product} as a way to act on live buying signals "
        f"before competitors reach the account. Buying window: {window}"
    )


def fallback_draft(
    stakeholder: Stakeholder,
    company: CompanyProfile,
    sender_name: str,
    sender_company: str,
) -> OutreachDraft:
    signal_hook = stakeholder.hook or f"Teams like {company.name} are prioritizing outbound efficiency this quarter."
    return OutreachDraft(
        stakeholder_name=stakeholder.name,
        stakeholder_title=stakeholder.title,
        subject_lines=[
            f"Quick idea for {company.name}'s GTM team",
            f"{stakeholder.name.split()[0]} — signal on {company.name}",
            "Saw something relevant to your sales motion",
        ],
        body=(
            f"Hi {stakeholder.name.split()[0]},\n\n"
            f"{signal_hook}\n\n"
            f"We built {sender_company} to turn those signals into ready-to-send outreach — "
            f"so reps spend less time researching and more time in conversations.\n\n"
            f"Worth a 15-minute look this week?\n\n"
            f"— {sender_name}"
        ),
        cta="Open to a quick call Thursday or Friday?",
    )


def get_demo_serp(company_name: str) -> list[dict]:
    return DEMO_SERP_RESULTS.get(company_name.lower(), [
        {"title": f"{company_name} hiring | LinkedIn", "url": f"https://linkedin.com/company/{company_name.lower()}", "snippet": f"{company_name} is actively hiring sales and revenue roles."},
    ])


def get_demo_jobs(company_name: str) -> list[dict]:
    return DEMO_JOB_RESULTS.get(company_name.lower(), [
        {"title": "Revenue Operations Manager", "url": f"https://jobs.lever.co/{company_name.lower()}", "snippet": "Evaluate and implement sales tools. Own the RevOps stack."},
        {"title": "Sales Development Representative", "url": f"https://boards.greenhouse.io/{company_name.lower()}", "snippet": "Outbound SDR role — 3 positions open."},
    ])

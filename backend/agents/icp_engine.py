"""
ICP Engine — scores companies and generates US SMB discovery queries.
"""
from __future__ import annotations
from models import CompanyProfile, ICPConfig


async def score_icp_fit(company: CompanyProfile, icp: ICPConfig) -> float:
    score = 0.0
    industry = (company.industry or "").lower()
    if icp.industries:
        if any(ind.lower() in industry for ind in icp.industries):
            score += 0.30
        elif industry:
            score += 0.10
    else:
        score += 0.20

    lo, hi = icp.employee_range
    if company.headcount is not None:
        if lo <= company.headcount <= hi:
            score += 0.20
        elif company.headcount < lo * 2:
            score += 0.08
    else:
        score += 0.10

    state = (company.us_state or company.location or "").upper()
    if not icp.us_states or any(s.upper() in state for s in icp.us_states):
        score += 0.15

    funding = (company.funding or "").lower()
    if icp.funding_stages:
        if any(fs.lower() in funding for fs in icp.funding_stages):
            score += 0.20
        elif funding:
            score += 0.08
    else:
        score += 0.12

    text = f"{company.name} {company.description} {industry}".lower()
    if icp.negative_signals:
        if not any(neg.lower() in text for neg in icp.negative_signals):
            score += 0.15
    else:
        score += 0.10

    return min(score, 1.0)


async def build_icp_search_queries(icp: ICPConfig) -> list[str]:
    industries = ", ".join(icp.industries[:3]) if icp.industries else "B2B SaaS"
    stages = " OR ".join(f'"{s}"' for s in (icp.funding_stages[:3] or ["Series A", "Series B"]))
    geo = ""
    if icp.us_states:
        geo = " ".join(icp.us_states[:3]) + " "
    queries = [
        f'US {industries} startup {stages} hiring sales 2026 site:greenhouse.io OR site:lever.co',
        f'{industries} SMB {geo}raised funding 2026 B2B SaaS',
        f'"{industries}" company hiring "VP Sales" OR "RevOps" United States 2026',
        f'US {industries} startup G2 reviews CRM alternative 2026',
        f'{industries} {geo}Series A OR Series B SaaS hiring SDR 2026',
        f'site:techcrunch.com {industries} startup funding US 2026',
        f'"{industries}" "sales enablement" OR "intent data" job posting US',
    ]
    return queries[:8]


async def filter_companies_by_icp(
    companies: list[CompanyProfile], icp: ICPConfig
) -> list[CompanyProfile]:
    scored: list[CompanyProfile] = []
    for c in companies:
        c.icp_score = await score_icp_fit(c, icp)
        if c.icp_score >= 0.3:
            scored.append(c)
    return sorted(scored, key=lambda x: x.icp_score, reverse=True)

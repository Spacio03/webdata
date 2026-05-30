"""
MOSAIC Pipeline Orchestrator
Runs all 6 agents in the correct order for a batch of companies.
This is the core agentic loop.
"""
from __future__ import annotations
import asyncio, uuid, os
from datetime import datetime

from models import (
    CompanyProfile, OpportunityDB, PipelineRequest,
    ScoreSnapshotDB, AlertLogDB,
    AsyncSessionLocal, Base, engine,
)
from agents.discovery   import discover_companies
from agents.dark_funnel import detect_dark_funnel_signals
from agents.temporal    import predict_buying_window
from agents.committee   import map_buying_committee
from agents.synthesis   import compute_opportunity_score, generate_account_brief, generate_all_drafts
from agents.memory      import remember_opportunity, recall_account_history

ALERT_SCORE_THRESHOLD = float(os.getenv("ALERT_SCORE_THRESHOLD", "70"))


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def run_pipeline(request: PipelineRequest) -> tuple[list[str], str | None]:
    """
    Full MOSAIC pipeline for a batch run.
    Returns created opportunity IDs and an optional warning message.
    """
    print(f"[Pipeline] Starting run for ICP: {request.icp_description[:60]}...")

    # ── Stage 1: Discovery ────────────────────────────────────────────────────
    companies, warning = await discover_companies(
        icp_description=request.icp_description,
        seed_names=request.target_companies,
    )
    print(f"[Pipeline] Discovered {len(companies)} companies")

    # ── Stages 2–6: Per-company agent pipeline (parallel) ─────────────────────
    tasks = [
        _process_company(company, request)
        for company in companies
    ]
    opportunity_ids = await asyncio.gather(*tasks, return_exceptions=True)

    created = [oid for oid in opportunity_ids if isinstance(oid, str)]
    print(f"[Pipeline] Created {len(created)} opportunities")
    return created, warning


async def _process_company(company: CompanyProfile, request: PipelineRequest) -> str | None:
    """Process one company through all agents and persist the opportunity."""
    try:
        print(f"  [→] Processing {company.name}...")

        # Stage 2: Dark Funnel — detect intent signals
        signals = await detect_dark_funnel_signals(company, product_category="sales automation")

        # Stage 3: Temporal — predict buying window
        buying_window = await predict_buying_window(company, signals)

        # Stage 4: Committee — map stakeholders
        committee = await map_buying_committee(company)

        # Stage 5a: Recall account history from memory (feeds into brief)
        history = await recall_account_history(company.name)

        # Stage 5b: Score + brief + drafts
        score = compute_opportunity_score(company, signals, buying_window, committee)

        # Only generate full brief + drafts for scored opportunities
        if score < 20 and not request.target_companies:
            print(f"  [✗] {company.name} scored {score} — below threshold, skipping")
            return None

        brief = await generate_account_brief(
            company=company,
            signals=signals,
            buying_window=buying_window,
            your_product=request.your_product,
            account_history=history,
        )

        drafts = await generate_all_drafts(
            committee=committee,
            company=company,
            account_brief=brief,
            your_product=request.your_product,
            sender_name=request.sender_name,
            sender_company=request.sender_company,
        )

        # Stage 6: Persist to DB + store in memory
        opp_id = await _save_opportunity(
            company=company,
            score=score,
            signals=signals,
            committee=committee,
            buying_window=buying_window,
            brief=brief,
            drafts=drafts,
        )

        # Save score snapshot for timeline
        await _save_score_snapshot(opp_id, company, score, signals, buying_window)

        # Fire alert if score crosses threshold
        if score >= ALERT_SCORE_THRESHOLD:
            await _fire_alert(opp_id, company, score, signals)

        await remember_opportunity(opp_id, company, signals, buying_window)
        print(f"  [✓] {company.name} → score {score} → saved as {opp_id}")
        return opp_id

    except Exception as e:
        print(f"  [✗] Failed to process {company.name}: {e}")
        return None


async def _save_opportunity(
    company, score, signals, committee, buying_window, brief, drafts
) -> str:
    opp_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as session:
        opp = OpportunityDB(
            id=opp_id,
            company_name=company.name,
            domain=company.domain,
            score=score,
            status="pending",
            signals=[s.model_dump() for s in signals],
            committee=[c.model_dump() for c in committee],
            buying_window=buying_window.model_dump() if buying_window else {},
            account_brief=brief,
            drafts=[d.model_dump() for d in drafts],
            created_at=datetime.utcnow(),
        )
        session.add(opp)
        await session.commit()
    return opp_id


async def _save_score_snapshot(
    opp_id: str,
    company: CompanyProfile,
    score: float,
    signals: list,
    buying_window,
) -> None:
    """Record a score snapshot for the account timeline."""
    # Build a human-readable trigger label from the top signal
    if buying_window:
        trigger = buying_window.pattern_label
    elif signals:
        top = max(signals, key=lambda s: s.confidence)
        type_labels = {
            "hiring_spike":    "Hiring spike detected",
            "funding":         "Funding announced",
            "dark_funnel":     "Dark funnel activity",
            "review_activity": "Competitor review activity",
            "job_posting":     "Job posting signal",
        }
        trigger = type_labels.get(top.signal_type, "Signal detected")
    else:
        trigger = "Baseline scan"

    async with AsyncSessionLocal() as session:
        snap = ScoreSnapshotDB(
            id=str(uuid.uuid4()),
            opportunity_id=opp_id,
            company_name=company.name,
            score=score,
            trigger_label=trigger,
            signals_count=len(signals),
            snapshot_at=datetime.utcnow(),
        )
        session.add(snap)
        await session.commit()


async def _fire_alert(
    opp_id: str,
    company: CompanyProfile,
    score: float,
    signals: list,
) -> None:
    """Fire a Slack alert and log it to the alert_logs table."""
    import httpx

    slack_url = os.getenv("SLACK_WEBHOOK_URL", "")
    top_signal = signals[0].evidence[:120] if signals else "Multiple signals detected"
    message = (
        f"🔥 *RevRadar Alert* — *{company.name}* crossed score threshold\n"
        f"Score: *{score}* | Domain: {company.domain}\n"
        f"Top signal: {top_signal}\n"
        f"<http://localhost:3000|View in RevRadar>"
    )

    status = "pending"
    if slack_url:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(slack_url, json={"text": message})
            status = "sent" if resp.status_code == 200 else "failed"
        except Exception as e:
            print(f"[Alert] Slack send failed: {e}")
            status = "failed"
    else:
        print(f"[Alert] SLACK_WEBHOOK_URL not set — would have fired: {message[:80]}...")
        status = "sent"   # treat as sent for demo purposes

    async with AsyncSessionLocal() as session:
        log = AlertLogDB(
            id=str(uuid.uuid4()),
            opportunity_id=opp_id,
            company_name=company.name,
            score=score,
            channel="slack",
            owner="Sarah Chen",
            status=status,
            message=message,
            fired_at=datetime.utcnow(),
        )
        session.add(log)
        await session.commit()

"""
MOSAIC GTM OS — FastAPI Backend
Run: uvicorn main:app --reload --port 8000
"""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Cognee reads OPENAI_API_KEY / OPENAI_API_BASE natively — map our AIML keys to those
import os as _os
if not _os.environ.get("OPENAI_API_KEY") and _os.environ.get("AIML_API_KEY"):
    _os.environ["OPENAI_API_KEY"]  = _os.environ["AIML_API_KEY"]
    _os.environ["OPENAI_API_BASE"] = _os.environ.get("AIML_BASE_URL", "https://api.aimlapi.com/v1")
    _os.environ["LLM_API_KEY"]     = _os.environ["AIML_API_KEY"]
    _os.environ["LLM_ENDPOINT"]    = _os.environ.get("AIML_BASE_URL", "https://api.aimlapi.com/v1")

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, update
from datetime import datetime
import sendgrid
from sendgrid.helpers.mail import Mail

from models import (
    PipelineRequest, Opportunity, OpportunityDB,
    ScoreSnapshotDB, ScoreSnapshot,
    AlertLogDB, AlertLog,
    GTMActionDB, GTMAction,
    AsyncSessionLocal, Base, engine,
)
from pipeline import run_pipeline, init_db, _fire_alert
from agents.memory import init_memory, remember_outcome

app = FastAPI(title="MOSAIC GTM OS", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000"), "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()
    try:
        await init_memory()
    except Exception as e:
        print(f"[Startup] Cognee init skipped: {e}")


# ── Pipeline trigger ──────────────────────────────────────────────────────────

@app.post("/api/pipeline/run", response_model=dict)
async def trigger_pipeline(request: PipelineRequest, background_tasks: BackgroundTasks):
    """Kick off the full pipeline in the background."""
    background_tasks.add_task(run_pipeline, request)
    return {"status": "running", "message": "Pipeline started. Check /api/opportunities for results."}


@app.post("/api/pipeline/run-sync", response_model=dict)
async def trigger_pipeline_sync(request: PipelineRequest):
    """Synchronous version — waits for results. Use for demos."""
    opportunity_ids, warning = await run_pipeline(request)
    return {
        "status": "complete",
        "opportunity_ids": opportunity_ids,
        "count": len(opportunity_ids),
        "warning": warning,
    }


# ── Opportunities ─────────────────────────────────────────────────────────────

@app.get("/api/opportunities", response_model=list[Opportunity])
async def list_opportunities(status: str = "pending", limit: int = 20):
    """List opportunities in the review queue, sorted by score descending."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(OpportunityDB)
            .where(OpportunityDB.status == status)
            .order_by(OpportunityDB.score.desc())
            .limit(limit)
        )
        rows = result.scalars().all()
    return [_db_to_opportunity(row) for row in rows]


@app.get("/api/opportunities/{opp_id}", response_model=Opportunity)
async def get_opportunity(opp_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(OpportunityDB).where(OpportunityDB.id == opp_id))
        row    = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return _db_to_opportunity(row)


@app.post("/api/opportunities/{opp_id}/approve", response_model=dict)
async def approve_opportunity(opp_id: str, draft_index: int = 0, to_email: str = ""):
    """Approve an opportunity and send the selected email draft."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(OpportunityDB).where(OpportunityDB.id == opp_id))
        row    = result.scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Opportunity not found")

        drafts = row.drafts or []
        if not drafts:
            raise HTTPException(status_code=400, detail="No drafts available")

        draft = drafts[min(draft_index, len(drafts) - 1)]

        send_result = await _send_email(
            to_email=to_email or f"demo@{row.domain}",
            subject=draft["subject_lines"][0],
            body=draft["body"],
        )

        await session.execute(
            update(OpportunityDB)
            .where(OpportunityDB.id == opp_id)
            .values(status="approved", approved_at=datetime.utcnow())
        )
        await session.commit()

    await remember_outcome(opp_id, row.company_name, "email_sent")
    return {"status": "approved", "email_sent": send_result, "to": to_email}


@app.post("/api/opportunities/{opp_id}/dismiss", response_model=dict)
async def dismiss_opportunity(opp_id: str, reason: str = "not_relevant"):
    async with AsyncSessionLocal() as session:
        await session.execute(
            update(OpportunityDB)
            .where(OpportunityDB.id == opp_id)
            .values(status="dismissed")
        )
        await session.commit()
    await remember_outcome(opp_id, "", f"dismissed:{reason}")
    return {"status": "dismissed"}


@app.post("/api/opportunities/{opp_id}/outcome", response_model=dict)
async def record_outcome(opp_id: str, outcome: str):
    """Record what happened: replied | meeting_booked | no_reply | bounced"""
    await remember_outcome(opp_id, "", outcome)
    return {"status": "recorded", "outcome": outcome}


# ── GTM Actions ───────────────────────────────────────────────────────────────

@app.post("/api/opportunities/{opp_id}/gtm-action", response_model=dict)
async def gtm_action(opp_id: str, action: GTMAction):
    """
    Execute a GTM action on an opportunity.
    action_type: slack_alert | crm_task | assign_ae | not_relevant
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(OpportunityDB).where(OpportunityDB.id == opp_id))
        row    = result.scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Opportunity not found")

    result_payload: dict = {"status": "ok", "action": action.action_type}

    if action.action_type == "slack_alert":
        # Fire a Slack alert immediately
        from models import CompanyProfile, IntentSignal
        company = CompanyProfile(
            name=row.company_name,
            domain=row.domain,
            icp_score=0.8,
            description="",
            industry="B2B SaaS",
            location="",
        )
        signals = [IntentSignal(**s) for s in (row.signals or [])]
        await _fire_alert(opp_id, company, row.score, signals)
        result_payload["message"] = f"Slack alert fired for {row.company_name}"

    elif action.action_type == "crm_task":
        # Log CRM task creation (stub — connect to HubSpot/Salesforce via OAuth)
        assignee = action.payload.get("assignee", "Unassigned")
        result_payload["message"] = f"CRM task created for {row.company_name}, assigned to {assignee}"

    elif action.action_type == "assign_ae":
        ae_name = action.payload.get("ae_name", "AE")
        result_payload["message"] = f"{row.company_name} assigned to {ae_name}"

    elif action.action_type == "not_relevant":
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(OpportunityDB)
                .where(OpportunityDB.id == opp_id)
                .values(status="dismissed")
            )
            await session.commit()
        await remember_outcome(opp_id, row.company_name, "dismissed:not_relevant")
        result_payload["message"] = f"{row.company_name} marked as not relevant"

    # Log the action
    async with AsyncSessionLocal() as session:
        log = GTMActionDB(
            id=str(__import__("uuid").uuid4()),
            opportunity_id=opp_id,
            company_name=row.company_name,
            action_type=action.action_type,
            payload=action.payload,
            performed_at=datetime.utcnow(),
        )
        session.add(log)
        await session.commit()

    return result_payload


# ── Account Timeline ──────────────────────────────────────────────────────────

@app.get("/api/opportunities/{opp_id}/timeline", response_model=list[ScoreSnapshot])
async def get_timeline(opp_id: str):
    """Return score snapshots for an opportunity — builds the account timeline."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ScoreSnapshotDB)
            .where(ScoreSnapshotDB.opportunity_id == opp_id)
            .order_by(ScoreSnapshotDB.snapshot_at.asc())
        )
        rows = result.scalars().all()

    return [
        ScoreSnapshot(
            id=r.id,
            opportunity_id=r.opportunity_id,
            company_name=r.company_name,
            score=r.score,
            trigger_label=r.trigger_label,
            signals_count=r.signals_count,
            snapshot_at=r.snapshot_at.isoformat() if r.snapshot_at else "",
        )
        for r in rows
    ]


@app.get("/api/companies/{company_name}/timeline", response_model=list[ScoreSnapshot])
async def get_company_timeline(company_name: str):
    """Return all score snapshots for a company across all pipeline runs."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ScoreSnapshotDB)
            .where(ScoreSnapshotDB.company_name == company_name)
            .order_by(ScoreSnapshotDB.snapshot_at.asc())
        )
        rows = result.scalars().all()

    return [
        ScoreSnapshot(
            id=r.id,
            opportunity_id=r.opportunity_id,
            company_name=r.company_name,
            score=r.score,
            trigger_label=r.trigger_label,
            signals_count=r.signals_count,
            snapshot_at=r.snapshot_at.isoformat() if r.snapshot_at else "",
        )
        for r in rows
    ]


# ── Alert Log ─────────────────────────────────────────────────────────────────

@app.get("/api/alerts", response_model=list[AlertLog])
async def list_alerts(limit: int = 50):
    """Return the alert log — the TriggerWare audit trail."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AlertLogDB)
            .order_by(AlertLogDB.fired_at.desc())
            .limit(limit)
        )
        rows = result.scalars().all()

    return [
        AlertLog(
            id=r.id,
            opportunity_id=r.opportunity_id,
            company_name=r.company_name,
            score=r.score,
            channel=r.channel,
            owner=r.owner,
            status=r.status,
            message=r.message,
            fired_at=r.fired_at.isoformat() if r.fired_at else "",
        )
        for r in rows
    ]


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    demo_mode = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")
    return {
        "status": "ok",
        "service": "MOSAIC GTM OS",
        "demo_mode": demo_mode,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _db_to_opportunity(row: OpportunityDB) -> Opportunity:
    from models import IntentSignal, Stakeholder, BuyingWindowPrediction, OutreachDraft
    return Opportunity(
        id=row.id,
        company_name=row.company_name,
        domain=row.domain,
        score=row.score,
        status=row.status,
        signals=[IntentSignal(**s) for s in (row.signals or [])],
        committee=[Stakeholder(**s) for s in (row.committee or [])],
        buying_window=BuyingWindowPrediction(**row.buying_window) if row.buying_window else None,
        account_brief=row.account_brief or "",
        drafts=[OutreachDraft(**d) for d in (row.drafts or [])],
        created_at=row.created_at.isoformat() if row.created_at else "",
    )


async def _send_email(to_email: str, subject: str, body: str) -> bool:
    api_key = os.getenv("SENDGRID_API_KEY")
    if not api_key:
        print(f"[Email] SENDGRID_API_KEY not set — would have sent to {to_email}")
        return False
    try:
        sg      = sendgrid.SendGridAPIClient(api_key=api_key)
        message = Mail(
            from_email=os.getenv("SENDGRID_FROM_EMAIL", "noreply@mosaic.ai"),
            to_emails=to_email,
            subject=subject,
            plain_text_content=body,
        )
        response = sg.client.mail.send.post(request_body=message.get())
        return response.status_code in (200, 202)
    except Exception as e:
        print(f"[Email] Send failed: {e}")
        return False

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
    ICPConfig, ICPConfigDB,
    OpportunityActionRequest, IntelligenceAskRequest,
    AgenticActionRequest,
    AsyncSessionLocal, Base, engine,
)
from pipeline import run_pipeline, init_db, _fire_alert
from agents.memory import init_memory, remember_outcome
from demo_data import get_demo_icp, DEMO_MODE
from triggerware_client import ask as tw_ask, emit_event, setup_mosaic_alerts

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
    try:
        await setup_mosaic_alerts(os.getenv("PUBLIC_BASE_URL", "http://localhost:8000"))
    except Exception as e:
        print(f"[Startup] TriggerWare alerts skipped: {e}")


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
async def list_opportunities(status: str = "", limit: int = 50):
    """List opportunities sorted by score descending. Empty status = all."""
    async with AsyncSessionLocal() as session:
        q = select(OpportunityDB).order_by(OpportunityDB.score.desc()).limit(limit)
        if status:
            q = q.where(OpportunityDB.status == status)
        result = await session.execute(q)
        rows = result.scalars().all()
    return [_db_to_opportunity(row) for row in rows]


# ── ICP config ────────────────────────────────────────────────────────────────

@app.post("/api/icp", response_model=dict)
async def save_icp(icp: ICPConfig):
    data = icp.model_dump()
    er = data.pop("employee_range")
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ICPConfigDB).limit(1))
        row = result.scalar_one_or_none()
        if row:
            row.industries = data.get("industries", [])
            row.employee_min = er[0]
            row.employee_max = er[1]
            row.us_states = data.get("us_states", [])
            row.funding_stages = data.get("funding_stages", [])
            row.tech_stack_signals = data.get("tech_stack_signals", [])
            row.negative_signals = data.get("negative_signals", [])
            row.your_product = data.get("your_product", "")
            row.sender_name = data.get("sender_name", "Alex")
            row.sender_company = data.get("sender_company", "MOSAIC")
            row.updated_at = datetime.utcnow()
        else:
            session.add(ICPConfigDB(
                industries=data.get("industries", []),
                employee_min=er[0],
                employee_max=er[1],
                us_states=data.get("us_states", []),
                funding_stages=data.get("funding_stages", []),
                tech_stack_signals=data.get("tech_stack_signals", []),
                negative_signals=data.get("negative_signals", []),
                your_product=data.get("your_product", ""),
                sender_name=data.get("sender_name", "Alex"),
                sender_company=data.get("sender_company", "MOSAIC"),
            ))
        await session.commit()
    return {"status": "saved"}


@app.get("/api/icp", response_model=dict)
async def get_icp():
    if DEMO_MODE:
        return get_demo_icp()
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ICPConfigDB).limit(1))
        row = result.scalar_one_or_none()
    if not row:
        return get_demo_icp()
    return {
        "industries": row.industries or [],
        "employee_range": [row.employee_min, row.employee_max],
        "us_states": row.us_states or [],
        "funding_stages": row.funding_stages or [],
        "tech_stack_signals": row.tech_stack_signals or [],
        "negative_signals": row.negative_signals or [],
        "your_product": row.your_product or "",
        "sender_name": row.sender_name or "Alex",
        "sender_company": row.sender_company or "MOSAIC",
    }


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


@app.post("/api/opportunities/{opp_id}/action", response_model=dict)
async def opportunity_action(opp_id: str, body: OpportunityActionRequest):
    """MOSAIC GTM actions: send_email | create_crm_task | assign_to_ae | send_slack | mark_irrelevant"""
    mapping = {
        "send_email": "send_email",
        "create_crm_task": "crm_task",
        "assign_to_ae": "assign_ae",
        "send_slack": "slack_alert",
        "mark_irrelevant": "not_relevant",
    }
    action_type = mapping.get(body.action_type, body.action_type)

    if action_type == "send_email":
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(OpportunityDB).where(OpportunityDB.id == opp_id))
            row = result.scalar_one_or_none()
            if not row:
                raise HTTPException(status_code=404, detail="Opportunity not found")
            drafts = row.drafts or []
            draft = drafts[min(body.draft_index, len(drafts) - 1)] if drafts else {}
            send_result = await _send_email(
                to_email=body.to_email or f"demo@{row.domain}",
                subject=(draft.get("subject_lines") or ["Outreach"])[0],
                body=draft.get("body", ""),
            )
            await session.execute(
                update(OpportunityDB)
                .where(OpportunityDB.id == opp_id)
                .values(status="approved", approved_at=datetime.utcnow())
            )
            await session.commit()
        await emit_event("email_sent", {"opportunity_id": opp_id, "notes": body.notes})
        await remember_outcome(opp_id, row.company_name, "email_sent")
        return {"status": "approved", "email_sent": send_result}

    action = GTMAction(
        action_type=action_type,
        opportunity_id=opp_id,
        payload={"notes": body.notes, "assignee": body.assignee, "ae_name": body.assignee},
    )
    return await gtm_action(opp_id, action)


@app.post("/api/intelligence/ask", response_model=dict)
async def intelligence_ask(req: IntelligenceAskRequest):
    answer = await tw_ask(req.question)
    return {"question": req.question, "answer": answer}


@app.post("/api/agentic/execute", response_model=dict)
async def execute_agentic_action(req: AgenticActionRequest):
    """
    Execute a cross-platform agent action.
    Email sends through SendGrid when SENDGRID_API_KEY is configured; other
    integrations are logged as performed demo actions unless real connectors are added.
    """
    action_type = req.action_type
    performed = False
    provider = "demo"
    message = "Action recorded in demo mode"

    if action_type == "email_draft":
        if not req.subject or not req.body:
            raise HTTPException(status_code=400, detail="Email actions require subject and body")
        target = req.to_email or f"demo@{req.account_name.lower().replace(' ', '')}.com"
        performed = await _send_email(
            to_email=target,
            subject=req.subject,
            body=req.body,
        )
        provider = "sendgrid" if os.getenv("SENDGRID_API_KEY") else "demo"
        message = "Email sent through SendGrid" if performed else "Email safely queued; configure SENDGRID_API_KEY to send live"
    elif action_type == "crm_update":
        message = "CRM task and score update prepared for Salesforce/HubSpot"
    elif action_type == "owner_assignment":
        message = f"Account owner routed to {req.owner or 'recommended AE'}"
    elif action_type == "slack_alert":
        await emit_event("slack_alert", {"account": req.account_name, "action_id": req.action_id})
        message = "Slack alert emitted to workflow bus"
    elif action_type == "sequence_start":
        message = "5-step Outreach/Salesloft sequence queued"
    elif action_type == "enrichment_refresh":
        message = "Bright Data enrichment refresh queued"
    else:
        message = f"{action_type} action logged"

    async with AsyncSessionLocal() as session:
        log = GTMActionDB(
            id=str(__import__("uuid").uuid4()),
            opportunity_id=req.account_id or req.action_id,
            company_name=req.account_name,
            action_type=action_type,
            payload={
                **(req.payload or {}),
                "to_email": req.to_email,
                "subject": req.subject,
                "provider": provider,
                "performed": performed,
                "message": message,
            },
            performed_at=datetime.utcnow(),
        )
        session.add(log)
        await session.commit()

    return {
        "status": "executed" if performed or action_type != "email_draft" else "queued",
        "performed": performed,
        "provider": provider,
        "message": message,
        "account_name": req.account_name,
        "action_type": action_type,
    }


@app.post("/api/webhooks/triggerware", response_model=dict)
async def webhook_triggerware(payload: dict):
    print(f"[Webhook] TriggerWare alert: {payload}")
    return {"status": "received"}


@app.post("/api/webhooks/triggerware/schedule", response_model=dict)
async def webhook_schedule(payload: dict):
    print(f"[Webhook] TriggerWare schedule: {payload}")
    if payload.get("action") == "auto_discovery":
        from demo_data import DEMO_MODE as dm
        if dm:
            await load_demo_from_webhook()
        else:
            await run_pipeline(PipelineRequest())
    return {"status": "received"}


async def load_demo_from_webhook():
    from demo_data import load_demo_pipeline_results
    await load_demo_pipeline_results()


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
        why_now_bullets=row.why_now_bullets or [],
        icp_score=row.icp_score or 0.0,
        icp_meta=row.icp_meta or {},
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

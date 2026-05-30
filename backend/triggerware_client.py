"""
TriggerWare client — events, SQL alerts, schedules, natural language ask.
Gracefully no-ops when not configured.
"""
from __future__ import annotations
import os
import httpx

TW_KEY = os.getenv("TRIGGERWARE_API_KEY", "")
TW_URL = (os.getenv("TRIGGERWARE_INSTANCE_URL") or "").rstrip("/")
PUBLIC_BASE = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")


def _configured() -> bool:
    return bool(TW_KEY and TW_URL)


async def emit_event(event_type: str, payload: dict) -> bool:
    if not _configured():
        print(f"[TriggerWare] emit_event skipped (not configured): {event_type}")
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{TW_URL}/api/events",
                headers={"Authorization": f"Bearer {TW_KEY}"},
                json={"type": event_type, "payload": payload},
            )
        return r.status_code < 300
    except Exception as e:
        print(f"[TriggerWare] emit_event failed: {e}")
        return False


async def run_query(sql: str) -> list[dict]:
    if not _configured():
        return []
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{TW_URL}/api/query",
                headers={"Authorization": f"Bearer {TW_KEY}"},
                json={"sql": sql},
            )
        if r.status_code == 200:
            data = r.json()
            return data if isinstance(data, list) else data.get("rows", [])
    except Exception as e:
        print(f"[TriggerWare] run_query failed: {e}")
    return []


async def register_alert(name: str, sql: str, webhook_url: str, interval_minutes: int = 15) -> bool:
    if not _configured():
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{TW_URL}/api/alerts",
                headers={"Authorization": f"Bearer {TW_KEY}"},
                json={"name": name, "sql": sql, "webhook_url": webhook_url, "interval_minutes": interval_minutes},
            )
        return r.status_code < 300
    except Exception as e:
        print(f"[TriggerWare] register_alert failed: {e}")
        return False


async def register_scheduled_trigger(name: str, cron: str, webhook_url: str, payload: dict) -> bool:
    if not _configured():
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{TW_URL}/api/schedules",
                headers={"Authorization": f"Bearer {TW_KEY}"},
                json={"name": name, "cron": cron, "webhook_url": webhook_url, "payload": payload},
            )
        return r.status_code < 300
    except Exception as e:
        print(f"[TriggerWare] register_scheduled_trigger failed: {e}")
        return False


async def ask(question: str) -> str:
    if not _configured():
        return _demo_ask_answer(question)
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            r = await client.post(
                f"{TW_URL}/api/ask",
                headers={"Authorization": f"Bearer {TW_KEY}"},
                json={"question": question},
            )
        if r.status_code == 200:
            data = r.json()
            return data.get("answer", data.get("result", str(data)))
    except Exception as e:
        print(f"[TriggerWare] ask failed: {e}")
    return _demo_ask_answer(question)


def _demo_ask_answer(question: str) -> str:
    q = question.lower()
    if "30 days" in q or "buying window" in q:
        return (
            "**Accounts with buying window under 30 days:**\n"
            "- Workstream (21 days) — Series B + 8 sales hires\n"
            "- Rootly (14 days) — dark funnel + AE hiring\n"
            "- Finch HR (30 days) — VP Sales + Series A"
        )
    if "meeting" in q or "convert" in q:
        return (
            "**Top converting signal types (demo data):**\n"
            "1. `revops_hire` — 68% meeting-book rate\n"
            "2. `series_b_funding` — 61%\n"
            "3. `hiring_spike_sales` — 54%"
        )
    if "industr" in q:
        return (
            "**Best converting industries this month:**\n"
            "1. HR Tech — 4 warm accounts, avg intent +38\n"
            "2. DevTools — 2 accounts, avg +31\n"
            "3. Fintech — 1 account, score 79"
        )
    if "dark funnel" in q:
        return (
            "**Dark funnel accounts:**\n"
            "- Rootly — Reddit PagerDuty alternative thread\n"
            "- Claap — G2 Loom dissatisfaction reviews"
        )
    return (
        "Based on your pipeline (demo mode): 5 US SMB accounts are active. "
        "Workstream (91) and Finch HR (84) are highest priority. "
        "3 accounts have buying windows under 30 days."
    )


async def setup_mosaic_alerts(base_url: str | None = None) -> None:
    base = (base_url or PUBLIC_BASE).rstrip("/")
    webhook = f"{base}/api/webhooks/triggerware"
    await register_alert(
        "high_priority_opportunity",
        "SELECT * FROM opportunities WHERE score > 75 AND status = 'pending'",
        webhook,
        15,
    )
    await register_alert(
        "followup_due",
        "SELECT * FROM opportunities WHERE status = 'approved' AND approved_at < NOW() - INTERVAL 72 HOUR",
        webhook,
        60,
    )
    await register_scheduled_trigger(
        "pipeline_health",
        "0 * * * *",
        f"{base}/api/webhooks/triggerware/schedule",
        {"action": "check_pipeline_health"},
    )

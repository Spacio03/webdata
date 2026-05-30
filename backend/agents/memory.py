"""
Agent 6: Memory Agent (Cognee)
Stores all signals, account interactions, and outcomes.
The system improves over time — this is the moat.
"""
from __future__ import annotations
import os
import cognee
from models import CompanyProfile, IntentSignal, BuyingWindowPrediction, Opportunity


async def init_memory():
    """Initialise Cognee memory store on startup."""
    try:
        # cognee 0.1.x config API
        await cognee.config.set_llm_config(
            llm_provider="openai",
            llm_model=os.getenv("AIML_MODEL", "gpt-4o"),
            llm_api_key=os.getenv("AIML_API_KEY", ""),
            llm_endpoint=os.getenv("AIML_BASE_URL", "https://api.aimlapi.com/v1"),
        )
    except Exception:
        # Fallback: set via environment variables that Cognee reads natively
        os.environ.setdefault("LLM_API_KEY",      os.getenv("AIML_API_KEY", ""))
        os.environ.setdefault("LLM_MODEL",         os.getenv("AIML_MODEL", "gpt-4o"))
        os.environ.setdefault("LLM_ENDPOINT",      os.getenv("AIML_BASE_URL", "https://api.aimlapi.com/v1"))
        os.environ.setdefault("OPENAI_API_KEY",    os.getenv("AIML_API_KEY", ""))
        os.environ.setdefault("OPENAI_API_BASE",   os.getenv("AIML_BASE_URL", "https://api.aimlapi.com/v1"))

    try:
        await cognee.prune.prune_system(metadata=True)
    except Exception as e:
        print(f"[Memory] prune_system skipped: {e}")


async def remember_opportunity(opportunity_id: str, company: CompanyProfile, signals: list[IntentSignal], buying_window: BuyingWindowPrediction | None):
    """
    Store a new opportunity in memory so agents can recall past interactions.
    """
    text = _build_memory_text(opportunity_id, company, signals, buying_window)
    try:
        await cognee.add(text, dataset_name="opportunities")
        await cognee.cognify()
    except Exception as e:
        print(f"[Memory] cognee.add failed: {e}")


async def remember_outcome(opportunity_id: str, company_name: str, outcome: str):
    """
    Store the outcome of an outreach attempt (replied, meeting_booked, no_reply, bounced).
    This data feeds back to improve the pattern library over time.
    """
    text = f"OUTCOME | company={company_name} | opportunity={opportunity_id} | result={outcome} | timestamp=now"
    try:
        await cognee.add(text, dataset_name="outcomes")
        await cognee.cognify()
    except Exception as e:
        print(f"[Memory] outcome storage failed: {e}")


async def recall_account_history(company_name: str) -> str:
    """
    Retrieve everything MOSAIC knows about a company from past interactions.
    Used by Synthesis Agent to avoid repeating outreach and spot warm re-engagement.
    """
    try:
        query   = f"What do we know about {company_name}? Past signals, outreach, outcomes."
        results = await cognee.search(query_text=query, query_type="insights")
        if results:
            return "\n".join(str(r) for r in results[:5])
    except Exception as e:
        print(f"[Memory] recall failed: {e}")
    return ""


async def recall_winning_patterns() -> str:
    """
    Ask the memory layer which signal combinations have historically led to replies/meetings.
    Used by Temporal Agent to dynamically weight patterns.
    """
    try:
        results = await cognee.search(
            query_text="Which signal types and patterns correlated with meeting_booked or replied outcomes?",
            query_type="insights",
        )
        if results:
            return "\n".join(str(r) for r in results[:5])
    except Exception as e:
        print(f"[Memory] pattern recall failed: {e}")
    return "No historical outcome data yet."


def _build_memory_text(
    opportunity_id: str,
    company: CompanyProfile,
    signals: list[IntentSignal],
    buying_window: BuyingWindowPrediction | None,
) -> str:
    lines = [
        f"OPPORTUNITY | id={opportunity_id} | company={company.name} | domain={company.domain}",
        f"ICP score={company.icp_score:.2f} | funding={company.funding} | headcount={company.headcount}",
    ]
    for s in signals:
        lines.append(f"SIGNAL | type={s.signal_type} | source={s.source} | confidence={s.confidence:.2f} | evidence={s.evidence[:100]}")
    if buying_window:
        lines.append(
            f"BUYING_WINDOW | pattern={buying_window.triggered_pattern} | "
            f"days={buying_window.days_to_window} | confidence={buying_window.confidence:.2f}"
        )
    return "\n".join(lines)

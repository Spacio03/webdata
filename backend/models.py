from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os, uuid

_raw_db_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./mosaic.db")
DATABASE_URL = (
    _raw_db_url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    if _raw_db_url.startswith("sqlite:///")
    else _raw_db_url
)
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


# ── SQLAlchemy DB models ─────────────────────────────────────────────────────

class ICPConfigDB(Base):
    __tablename__ = "icp_configs"
    id               = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    industries       = Column(JSON, default=list)
    employee_min     = Column(Integer, default=10)
    employee_max     = Column(Integer, default=200)
    us_states        = Column(JSON, default=list)
    funding_stages   = Column(JSON, default=list)
    tech_stack_signals = Column(JSON, default=list)
    negative_signals = Column(JSON, default=list)
    your_product     = Column(Text, default="")
    sender_name      = Column(String, default="Alex")
    sender_company   = Column(String, default="MOSAIC")
    updated_at       = Column(DateTime, default=datetime.utcnow)


class OpportunityDB(Base):
    __tablename__ = "opportunities"
    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name  = Column(String, index=True)
    domain        = Column(String)
    score         = Column(Float, default=0.0)
    status        = Column(String, default="pending")   # pending | approved | dismissed
    signals       = Column(JSON, default=list)          # list of IntentSignal dicts
    committee     = Column(JSON, default=list)          # list of Stakeholder dicts
    buying_window = Column(JSON, default=dict)          # BuyingWindowPrediction dict
    account_brief = Column(Text)
    drafts        = Column(JSON, default=list)          # list of OutreachDraft dicts
    why_now_bullets = Column(JSON, default=list)
    icp_score     = Column(Float, default=0.0)
    icp_meta      = Column(JSON, default=dict)          # industry, employees, state
    created_at    = Column(DateTime, default=datetime.utcnow)
    approved_at   = Column(DateTime, nullable=True)


class ScoreSnapshotDB(Base):
    """One row per pipeline run per company — builds the account timeline."""
    __tablename__ = "score_snapshots"
    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id = Column(String, index=True)
    company_name   = Column(String, index=True)
    score          = Column(Float)
    trigger_label  = Column(String)   # human-readable reason for score change
    signals_count  = Column(Integer, default=0)
    snapshot_at    = Column(DateTime, default=datetime.utcnow)


class AlertLogDB(Base):
    """Fired alerts — the TriggerWare audit trail."""
    __tablename__ = "alert_logs"
    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id = Column(String, index=True)
    company_name   = Column(String)
    score          = Column(Float)
    channel        = Column(String)   # slack | crm | email
    owner          = Column(String)
    status         = Column(String)   # sent | failed | pending
    message        = Column(Text)
    fired_at       = Column(DateTime, default=datetime.utcnow)


class GTMActionDB(Base):
    """Log of GTM actions taken on opportunities."""
    __tablename__ = "gtm_actions"
    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id = Column(String, index=True)
    company_name   = Column(String)
    action_type    = Column(String)   # slack_alert | crm_task | assign_ae | not_relevant
    payload        = Column(JSON, default=dict)
    performed_at   = Column(DateTime, default=datetime.utcnow)


# ── Pydantic data models (agent I/O) ────────────────────────────────────────

class CompanyProfile(BaseModel):
    name:         str
    domain:       str
    description:  str = ""
    headcount:    Optional[int] = None
    funding:      Optional[str] = None
    industry:     str = ""
    location:     str = ""
    us_state:     str = ""
    source_url:   str = ""
    icp_score:    float = 0.0


class IntentSignal(BaseModel):
    signal_type:      str    # dark_funnel | job_posting | funding | hiring_spike | review_activity
    source:           str    # reddit | g2 | linkedin | serp | news
    evidence:         str    # the actual text / snippet
    source_url:       str = ""
    confidence:       float = 0.5
    detected_at:      str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    ai_interpretation: str = ""   # LLM-generated "what this means"
    score_impact:     float = 0.0  # how much this signal contributed to the score


class BuyingWindowPrediction(BaseModel):
    triggered_pattern: str   # e.g. "series_a_funding"
    pattern_label:     str   # human readable
    days_to_window:    int   # estimated days until they're ready to buy
    confidence:        float
    evidence:          str


class Stakeholder(BaseModel):
    name:        str
    title:       str
    linkedin_url: str = ""
    role_in_deal: str  # champion | economic_buyer | technical_evaluator | blocker | user_buyer
    priority:    int   # 1 = highest
    background:  str = ""
    hook:        str = ""   # personalisation hook for outreach


class OutreachDraft(BaseModel):
    stakeholder_name:  str
    stakeholder_title: str
    subject_lines:     list[str]
    body:              str
    cta:               str


class TimelineEntry(BaseModel):
    date:          str
    score:         float
    trigger_label: str
    signal_type:   str = ""


class ICPConfig(BaseModel):
    industries: list[str] = ["SaaS", "HR Tech", "DevTools"]
    employee_range: tuple[int, int] = (10, 200)
    us_states: list[str] = []
    funding_stages: list[str] = ["Seed", "Series A", "Series B"]
    tech_stack_signals: list[str] = []
    negative_signals: list[str] = ["enterprise", "government"]
    your_product: str = ""
    sender_name: str = "Alex"
    sender_company: str = "MOSAIC"


class Opportunity(BaseModel):
    id:           str
    company_name: str
    domain:       str
    score:        float
    status:       str
    signals:      list[IntentSignal]
    committee:    list[Stakeholder]
    buying_window: Optional[BuyingWindowPrediction]
    account_brief: str
    drafts:        list[OutreachDraft]
    why_now_bullets: list[str] = []
    icp_score:     float = 0.0
    icp_meta:      dict = {}
    created_at:    str


class PipelineRequest(BaseModel):
    icp_description: str = Field(
        default="US B2B SaaS SMBs 10-200 employees scaling GTM",
        example="B2B SaaS companies with 20-200 employees in the sales tech space that are scaling their GTM team"
    )
    target_companies: list[str] = Field(
        default=[],
        example=["Finch HR", "Workstream"]
    )
    your_product: str = Field(
        default="AI revenue platform that turns live web signals into outbound actions",
        example="Revenue automation platform that reactivates dormant leads using AI"
    )
    sender_name: str = "Alex"
    sender_company: str = "MOSAIC"
    icp_config: Optional[ICPConfig] = None


class OpportunityActionRequest(BaseModel):
    action_type: str
    notes: str = ""
    assignee: str = ""
    draft_index: int = 0
    to_email: str = ""


class IntelligenceAskRequest(BaseModel):
    question: str


class AgenticActionRequest(BaseModel):
    action_id: str
    account_id: str = ""
    account_name: str
    action_type: str
    to_email: str = ""
    subject: str = ""
    body: str = ""
    owner: str = ""
    payload: dict = {}


# ── New response models ───────────────────────────────────────────────────────

class ScoreSnapshot(BaseModel):
    id:             str
    opportunity_id: str
    company_name:   str
    score:          float
    trigger_label:  str
    signals_count:  int
    snapshot_at:    str


class AlertLog(BaseModel):
    id:             str
    opportunity_id: str
    company_name:   str
    score:          float
    channel:        str
    owner:          str
    status:         str
    message:        str
    fired_at:       str


class GTMAction(BaseModel):
    action_type:    str   # slack_alert | crm_task | assign_ae | not_relevant
    opportunity_id: str
    payload:        dict = {}


class WhyNowItem(BaseModel):
    label:       str   # "Hired VP Sales"
    source:      str   # "LinkedIn"
    evidence:    str   # raw snippet
    score_delta: float # how much this moved the score
    signal_type: str

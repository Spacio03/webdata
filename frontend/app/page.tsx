'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, XCircle, Clock, ChevronDown, ChevronUp,
  Loader2, ArrowUpRight, Plus, X, Bell, Zap, UserPlus,
  Slack, Database, TrendingUp, AlertTriangle, ExternalLink,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Types ─────────────────────────────────────────────────────────────────────

type Signal = {
  signal_type: string; source: string; evidence: string
  confidence: number; source_url: string
  ai_interpretation: string; score_impact: number
}
type Stakeholder = {
  name: string; title: string; role_in_deal: string
  priority: number; hook: string; linkedin_url: string
}
type Draft = {
  stakeholder_name: string; stakeholder_title: string
  subject_lines: string[]; body: string; cta: string
}
type BuyingWindow = {
  pattern_label: string; days_to_window: number
  confidence: number; evidence: string
}
type Opportunity = {
  id: string; company_name: string; domain: string
  score: number; status: string
  signals: Signal[]; committee: Stakeholder[]
  buying_window: BuyingWindow | null
  account_brief: string; drafts: Draft[]; created_at: string
}
type ScoreSnapshot = {
  id: string; score: number; trigger_label: string
  signals_count: number; snapshot_at: string
}
type AlertLog = {
  id: string; company_name: string; score: number
  channel: string; owner: string; status: string
  message: string; fired_at: string; opportunity_id: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 70 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    score >= 45 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                  'text-neutral-600 bg-neutral-50 border-neutral-200'
  return (
    <span className={`inline-flex items-center tabular-nums rounded-md border px-2 py-0.5 text-sm font-semibold ${tone}`}>
      {Math.round(score)}
    </span>
  )
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 45 ? 'bg-amber-400' : 'bg-neutral-300'
  return (
    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const SIGNAL_SOURCE_COLORS: Record<string, string> = {
  'Greenhouse': 'bg-green-50 text-green-700 border-green-200',
  'LinkedIn':   'bg-blue-50 text-blue-700 border-blue-200',
  'Reddit':     'bg-orange-50 text-orange-700 border-orange-200',
  'G2':         'bg-purple-50 text-purple-700 border-purple-200',
  'TechCrunch': 'bg-red-50 text-red-700 border-red-200',
  'Crunchbase': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'SERP':       'bg-neutral-50 text-neutral-600 border-neutral-200',
  'Lever':      'bg-teal-50 text-teal-700 border-teal-200',
  'demo':       'bg-neutral-50 text-neutral-500 border-neutral-200',
}

function SourceTag({ source }: { source: string }) {
  const cls = SIGNAL_SOURCE_COLORS[source] ?? 'bg-neutral-50 text-neutral-600 border-neutral-200'
  return <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${cls}`}>{source}</span>
}

// ── Account Timeline ──────────────────────────────────────────────────────────

function AccountTimeline({ oppId }: { oppId: string }) {
  const [snapshots, setSnapshots] = useState<ScoreSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/opportunities/${oppId}/timeline`)
      .then(r => r.json())
      .then(data => { setSnapshots(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [oppId])

  if (loading) return <div className="flex items-center gap-2 text-xs text-neutral-400 py-2"><Loader2 size={12} className="animate-spin" /> Loading timeline…</div>
  if (!snapshots.length) return <p className="text-xs text-neutral-400 py-2">No timeline data yet — run the pipeline again to build history.</p>

  const maxScore = Math.max(...snapshots.map(s => s.score), 1)

  return (
    <div className="space-y-0">
      {snapshots.map((snap, i) => {
        const prev = snapshots[i - 1]
        const delta = prev ? snap.score - prev.score : 0
        const isLast = i === snapshots.length - 1
        return (
          <div key={snap.id} className="flex gap-3">
            {/* Timeline spine */}
            <div className="flex flex-col items-center flex-shrink-0 w-6">
              <div className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 mt-0.5 ${isLast ? 'border-emerald-500 bg-emerald-500' : 'border-neutral-300 bg-white'}`} />
              {!isLast && <div className="w-px flex-1 bg-neutral-200 my-1" />}
            </div>
            {/* Content */}
            <div className={`pb-4 flex-1 min-w-0 ${isLast ? '' : ''}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-neutral-400">{formatDate(snap.snapshot_at)}</span>
                <ScoreBadge score={snap.score} />
                {delta !== 0 && (
                  <span className={`text-xs font-medium ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(0)}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-600 mt-0.5">{snap.trigger_label}</p>
              <div className="mt-1 w-32">
                <ScoreBar score={snap.score} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Why Now Panel ─────────────────────────────────────────────────────────────

function WhyNowPanel({ signals }: { signals: Signal[] }) {
  if (!signals.length) return null
  const top = signals.slice(0, 4)

  const typeLabel: Record<string, string> = {
    hiring_spike:    'Hiring spike',
    funding:         'Funding announced',
    dark_funnel:     'Dark funnel activity',
    review_activity: 'Competitor review',
    job_posting:     'Job posting signal',
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Zap size={14} className="text-amber-600 flex-shrink-0" />
        <h4 className="text-sm font-semibold text-amber-900">Why now?</h4>
      </div>
      <div className="space-y-2.5">
        {top.map((s, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-amber-900">
                  {typeLabel[s.signal_type] ?? s.signal_type.replace(/_/g, ' ')}
                </span>
                <SourceTag source={s.source} />
                {s.score_impact > 0 && (
                  <span className="text-xs text-emerald-700 font-medium">+{s.score_impact.toFixed(0)} pts</span>
                )}
              </div>
              <p className="text-xs text-amber-800 mt-0.5 leading-snug">{s.evidence.slice(0, 120)}{s.evidence.length > 120 ? '…' : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Evidence Cards ────────────────────────────────────────────────────────────

function EvidenceCard({ signal }: { signal: Signal }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <SourceTag source={signal.source} />
        <span className="tag">{signal.signal_type.replace(/_/g, ' ')}</span>
        <span className="ml-auto text-xs text-neutral-400 tabular-nums">{(signal.confidence * 100).toFixed(0)}% conf</span>
      </div>
      <p className="text-xs text-neutral-700 leading-relaxed">
        <span className="font-medium text-neutral-900">Evidence: </span>
        {signal.evidence.slice(0, 220)}{signal.evidence.length > 220 ? '…' : ''}
        {signal.source_url && (
          <a href={signal.source_url} target="_blank" rel="noreferrer"
            className="ml-1 inline-flex items-center gap-0.5 text-neutral-500 hover:text-neutral-900 underline underline-offset-2">
            Source <ExternalLink size={9} />
          </a>
        )}
      </p>
      {signal.ai_interpretation && (
        <p className="text-xs text-neutral-500 leading-snug border-t border-neutral-100 pt-2">
          <span className="font-medium text-neutral-700">AI: </span>{signal.ai_interpretation}
        </p>
      )}
      {signal.score_impact > 0 && (
        <p className="text-xs text-emerald-700 font-medium">Score impact: +{signal.score_impact.toFixed(0)} pts</p>
      )}
    </div>
  )
}

// ── GTM Action Bar ────────────────────────────────────────────────────────────

function GTMActionBar({ opp, onAction }: {
  opp: Opportunity
  onAction: (oppId: string, actionType: string) => Promise<void>
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const fire = async (type: string) => {
    setLoading(type)
    await onAction(opp.id, type)
    setLoading(null)
    setDone(type)
    setTimeout(() => setDone(null), 3000)
  }

  const actions = [
    { type: 'slack_alert', label: 'Send Slack Alert', icon: <Slack size={13} />, cls: 'btn-black' },
    { type: 'crm_task',    label: 'Create CRM Task',  icon: <Database size={13} />, cls: 'btn-outline' },
    { type: 'assign_ae',   label: 'Assign to AE',     icon: <UserPlus size={13} />, cls: 'btn-outline' },
    { type: 'not_relevant',label: 'Not Relevant',     icon: <XCircle size={13} />,  cls: 'btn-outline text-neutral-400' },
  ]

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {actions.map(a => (
        <button
          key={a.type}
          onClick={() => fire(a.type)}
          disabled={loading !== null}
          className={`${a.cls} py-1.5 px-3 text-xs`}
        >
          {loading === a.type
            ? <Loader2 size={12} className="animate-spin" />
            : done === a.type
              ? <CheckCircle size={12} className="text-emerald-500" />
              : a.icon}
          {a.label}
        </button>
      ))}
    </div>
  )
}

// ── Opportunity Row ───────────────────────────────────────────────────────────

function OpportunityRow({ opp, onGTMAction, onRefresh }: {
  opp: Opportunity
  onGTMAction: (oppId: string, actionType: string) => Promise<void>
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'signals' | 'committee' | 'drafts' | 'timeline'>('signals')
  const [selectedDraft, setSelectedDraft] = useState(0)

  return (
    <div className="border-b border-neutral-100 last:border-0">
      {/* Row header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-4 px-5 py-4 hover:bg-neutral-50/80 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-md bg-neutral-100 flex items-center justify-center text-sm font-semibold text-neutral-600 flex-shrink-0">
          {opp.company_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-900 truncate">{opp.company_name}</span>
            <span className="text-xs text-neutral-400 hidden sm:inline">{opp.domain}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {opp.signals.slice(0, 3).map((s, i) => (
              <span key={i} className="tag">{s.signal_type.replace(/_/g, ' ')}</span>
            ))}
            {opp.signals.length > 3 && <span className="text-xs text-neutral-400">+{opp.signals.length - 3}</span>}
            {opp.buying_window && (
              <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                <Clock size={11} />{opp.buying_window.days_to_window}d window
              </span>
            )}
          </div>
        </div>
        <ScoreBadge score={opp.score} />
        {open ? <ChevronUp size={16} className="text-neutral-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-neutral-400 flex-shrink-0" />}
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-5 pb-6 pt-0 ml-14 border-t border-neutral-100 bg-neutral-50/40">
          {/* Why Now panel */}
          <div className="pt-4">
            <WhyNowPanel signals={opp.signals} />
          </div>

          {/* Buying window */}
          {opp.buying_window && (
            <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={13} className="text-neutral-500" />
                <h4 className="label">Buying window</h4>
              </div>
              <p className="text-sm font-medium text-neutral-900">{opp.buying_window.pattern_label}</p>
              <p className="text-sm text-neutral-600 mt-1">{opp.buying_window.evidence}</p>
              <p className="text-xs text-neutral-400 mt-2">
                {opp.buying_window.days_to_window} days · {(opp.buying_window.confidence * 100).toFixed(0)}% confidence
              </p>
            </div>
          )}

          {/* Sub-tabs */}
          <div className="flex gap-5 mt-5 border-b border-neutral-200">
            {(['signals', 'committee', 'drafts', 'timeline'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`pb-2 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                  tab === t ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}>
                {t}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === 'signals' && (
              <div className="space-y-2">
                {opp.signals.map((s, i) => <EvidenceCard key={i} signal={s} />)}
              </div>
            )}

            {tab === 'committee' && (
              <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
                {opp.committee.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-medium text-neutral-600 flex-shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-neutral-900">{s.name}</span>
                        <span className="tag">{s.role_in_deal.replace(/_/g, ' ')}</span>
                        {s.linkedin_url && (
                          <a href={s.linkedin_url} target="_blank" rel="noreferrer"
                            className="text-xs text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-0.5">
                            LinkedIn <ArrowUpRight size={10} />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">{s.title}</p>
                      {s.hook && <p className="text-xs text-neutral-600 mt-1 italic">"{s.hook.slice(0, 140)}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'drafts' && opp.drafts.length > 0 && (
              <div>
                {opp.drafts.length > 1 && (
                  <div className="flex gap-1 mb-3">
                    {opp.drafts.map((d, i) => (
                      <button key={i} onClick={() => setSelectedDraft(i)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                          selectedDraft === i ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'
                        }`}>
                        {d.stakeholder_name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                )}
                {(() => {
                  const draft = opp.drafts[selectedDraft]
                  return (
                    <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3 text-sm">
                      <div>
                        <p className="label mb-1.5">Subject lines</p>
                        {draft.subject_lines.map((subj, i) => (
                          <p key={i} className="text-neutral-800">{subj}</p>
                        ))}
                      </div>
                      <div>
                        <p className="label mb-1.5">Body</p>
                        <p className="text-neutral-700 whitespace-pre-line leading-relaxed">{draft.body}</p>
                      </div>
                      <p className="text-xs text-neutral-500 pt-2 border-t border-neutral-100">CTA: {draft.cta}</p>
                    </div>
                  )
                })()}
              </div>
            )}

            {tab === 'timeline' && <AccountTimeline oppId={opp.id} />}
          </div>

          {/* Account brief */}
          {opp.account_brief && (
            <div className="mt-4">
              <h4 className="label mb-2">Account brief</h4>
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{opp.account_brief}</p>
            </div>
          )}

          {/* GTM Actions */}
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <h4 className="label mb-2">GTM Actions</h4>
            <GTMActionBar opp={opp} onAction={onGTMAction} />
          </div>
        </div>
      )}

      {opp.status !== 'pending' && !open && (
        <div className="px-5 pb-3 -mt-2 ml-14 flex items-center gap-1.5 text-xs text-neutral-500">
          {opp.status === 'approved'
            ? <CheckCircle size={13} className="text-emerald-600" />
            : <XCircle size={13} />}
          {opp.status.charAt(0).toUpperCase() + opp.status.slice(1)}
        </div>
      )}
    </div>
  )
}

// ── Alert Log Screen ──────────────────────────────────────────────────────────

function AlertLogScreen() {
  const [alerts, setAlerts] = useState<AlertLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/alerts`)
      .then(r => r.json())
      .then(data => { setAlerts(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const channelIcon = (ch: string) => {
    if (ch === 'slack') return <Slack size={13} className="text-purple-600" />
    if (ch === 'crm')   return <Database size={13} className="text-blue-600" />
    return <Bell size={13} className="text-neutral-500" />
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-neutral-900">Alert log</h2>
        <p className="text-sm text-neutral-500 mt-0.5">TriggerWare-fired alerts when accounts cross the score threshold.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-400 text-sm py-10 justify-center">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-16 text-center">
          <Bell size={24} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-900">No alerts fired yet</p>
          <p className="text-sm text-neutral-500 mt-1">Alerts fire automatically when an account score crosses 70.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {alerts.map((alert, i) => (
            <div key={alert.id} className="flex items-start gap-4 px-5 py-4 border-b border-neutral-100 last:border-0">
              <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                {channelIcon(alert.channel)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-neutral-900">{alert.company_name}</span>
                  <ScoreBadge score={alert.score} />
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    alert.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {alert.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                  <span className="capitalize">Channel: {alert.channel}</span>
                  <span>Owner: {alert.owner}</span>
                  <span>{timeAgo(alert.fired_at)}</span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 truncate">{alert.message.slice(0, 120)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Pipeline Form ─────────────────────────────────────────────────────────────

function PipelineForm({ onComplete }: { onComplete: () => void }) {
  const [form, setForm] = useState({
    icp_description: 'B2B SaaS companies with 20-200 employees scaling their sales team',
    target_companies: 'Notion, Linear, Retool',
    your_product: 'AI revenue platform that reactivates dormant leads using live web signals',
    sender_name: 'Alex',
    sender_company: 'RevRadar',
  })
  const [running, setRunning] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  const run = async () => {
    setRunning(true)
    setWarning(null)
    try {
      const res = await fetch(`${API}/api/pipeline/run-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icp_description:  form.icp_description,
          target_companies: form.target_companies.split(',').map(s => s.trim()).filter(Boolean),
          your_product:     form.your_product,
          sender_name:      form.sender_name,
          sender_company:   form.sender_company,
        }),
      })
      const data = await res.json()
      if (data.warning) setWarning(data.warning)
      onComplete()
    } catch {
      setWarning('Pipeline failed — check the backend terminal for details.')
    }
    setRunning(false)
  }

  const fields = [
    { label: 'ICP description',   key: 'icp_description',   placeholder: 'B2B SaaS, 20–200 employees…' },
    { label: 'Target companies',  key: 'target_companies',  placeholder: 'Notion, Linear, Retool (optional)' },
    { label: 'Your product',      key: 'your_product',      placeholder: 'One-line product description' },
    { label: 'Sender name',       key: 'sender_name',       placeholder: 'Alex' },
    { label: 'Sender company',    key: 'sender_company',    placeholder: 'RevRadar' },
  ]

  return (
    <div className="card p-5 mb-8 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Run pipeline</h2>
        <p className="text-xs text-neutral-500 mt-0.5">Discovery → Dark Funnel → Temporal → Committee → Synthesis → Memory</p>
      </div>
      {warning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
          {warning}
        </div>
      )}
      <div className="space-y-3">
        {fields.map(({ label, key, placeholder }) => (
          <div key={key}>
            <label className="label block mb-1">{label}</label>
            <input
              value={form[key as keyof typeof form]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="input"
            />
          </div>
        ))}
      </div>
      <button onClick={run} disabled={running} className="btn-black w-full py-2.5">
        {running ? <><Loader2 size={14} className="animate-spin" /> Running pipeline…</> : 'Start pipeline'}
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [opps, setOpps]         = useState<Opportunity[]>([])
  const [loading, setLoading]   = useState(false)
  const [tab, setTab]           = useState<'pending' | 'approved' | 'dismissed'>('pending')
  const [screen, setScreen]     = useState<'queue' | 'alerts'>('queue')
  const [showForm, setShowForm] = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  const fetchOpps = useCallback(async (status: string) => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/opportunities?status=${status}`)
      const data = await res.json()
      setOpps(Array.isArray(data) ? data : [])
    } catch { setOpps([]) }
    setLoading(false)
  }, [])

  // Check demo mode from health endpoint
  useEffect(() => {
    fetch(`${API}/api/health`)
      .then(r => r.json())
      .then(d => setDemoMode(d.demo_mode === true))
      .catch(() => {})
  }, [])

  useEffect(() => { fetchOpps(tab) }, [tab, fetchOpps])

  const handleGTMAction = async (oppId: string, actionType: string) => {
    await fetch(`${API}/api/opportunities/${oppId}/gtm-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type: actionType, opportunity_id: oppId, payload: {} }),
    })
    if (actionType === 'not_relevant') fetchOpps(tab)
  }

  const pending  = opps.filter(o => o.status === 'pending').length
  const approved = opps.filter(o => o.status === 'approved').length
  const avgScore = opps.length ? Math.round(opps.reduce((a, o) => a + o.score, 0) / opps.length) : 0

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-neutral-200 sticky top-0 bg-white z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-neutral-900 tracking-tight">RevRadar</span>
            {demoMode && (
              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                Demo mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScreen(s => s === 'alerts' ? 'queue' : 'alerts')}
              className={`btn-outline py-1.5 px-3 text-xs ${screen === 'alerts' ? 'bg-neutral-900 text-white border-neutral-900' : ''}`}
            >
              <Bell size={13} /> Alerts
            </button>
            <button
              onClick={() => { setShowForm(f => !f); setScreen('queue') }}
              className="btn-black py-1.5"
            >
              {showForm ? <><X size={14} /> Close</> : <><Plus size={14} /> New run</>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {screen === 'alerts' ? (
          <AlertLogScreen />
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Review queue</h1>
              <p className="mt-1 text-sm text-neutral-500">
                AI-scored accounts with signals, buying committee, timeline, and ready-to-send drafts.
              </p>
            </div>

            {showForm && (
              <PipelineForm onComplete={() => { fetchOpps('pending'); setTab('pending'); setShowForm(false) }} />
            )}

            {/* Stats strip */}
            <div className="flex items-center gap-6 mb-6 pb-6 border-b border-neutral-200 text-sm">
              <div><span className="text-neutral-400">Pending </span><span className="font-semibold text-neutral-900 tabular-nums">{pending}</span></div>
              <div><span className="text-neutral-400">Approved </span><span className="font-semibold text-neutral-900 tabular-nums">{approved}</span></div>
              <div><span className="text-neutral-400">Avg score </span><span className="font-semibold text-neutral-900 tabular-nums">{avgScore || '—'}</span></div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 mb-4 border-b border-neutral-200">
              {(['pending', 'approved', 'dismissed'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`pb-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                    tab === t ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}>
                  {t}
                </button>
              ))}
            </div>

            {/* List */}
            {loading ? (
              <div className="flex items-center justify-center py-20 text-neutral-400 gap-2 text-sm">
                <Loader2 size={16} className="animate-spin" /> Loading…
              </div>
            ) : opps.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-sm font-medium text-neutral-900">No {tab} opportunities</p>
                <p className="text-sm text-neutral-500 mt-1">
                  {tab === 'pending' ? 'Run the pipeline to discover accounts.' : 'Nothing here yet.'}
                </p>
                {tab === 'pending' && !showForm && (
                  <button onClick={() => setShowForm(true)} className="btn-black mt-5">
                    <Plus size={14} /> New run
                  </button>
                )}
              </div>
            ) : (
              <div className="card overflow-hidden">
                {opps.map(opp => (
                  <OpportunityRow
                    key={opp.id}
                    opp={opp}
                    onGTMAction={handleGTMAction}
                    onRefresh={() => fetchOpps(tab)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-6 py-8 border-t border-neutral-100 mt-4">
        <p className="text-xs text-neutral-400">Powered by Bright Data · Cognee · AI/ML API · 6-agent pipeline</p>
      </footer>
    </div>
  )
}

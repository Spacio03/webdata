'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, ExternalLink, Mail, ClipboardList,
  UserPlus, Ban, Zap, Loader2, CheckCircle2, PhoneCall,
  MessageSquareText, CalendarCheck, ShieldCheck, Copy,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Opportunity, ScoreSnapshot } from '@/lib/api'

function scoreBadgeVariant(s: number): 'success' | 'warning' | 'muted' {
  if (s >= 75) return 'success'
  if (s >= 50) return 'warning'
  return 'muted'
}

const SIGNAL_LABELS: Record<string, string> = {
  hiring_spike: 'Hiring',
  funding: 'Funding',
  dark_funnel: 'Dark funnel',
  review_activity: 'Reviews',
  job_posting: 'Jobs',
}

const ROLE_LABELS: Record<string, string> = {
  champion: 'Champion',
  economic_buyer: 'Economic buyer',
  technical_evaluator: 'Technical',
  blocker: 'Blocker',
}

type Props = {
  opp: Opportunity
  timeline: ScoreSnapshot[]
  timelineLoading?: boolean
  expanded: boolean
  onToggle: () => void
  onAction: (action: string, extra?: Record<string, string>, draftIndex?: number) => Promise<void>
  actionBusy?: boolean
}

export function OpportunityCard({
  opp,
  timeline,
  timelineLoading,
  expanded,
  onToggle,
  onAction,
  actionBusy,
}: Props) {
  const [draftIdx, setDraftIdx] = useState(0)
  const [aeName, setAeName] = useState('')
  const [dismissReason, setDismissReason] = useState('')
  const [actionDone, setActionDone] = useState<string | null>(null)

  const meta = opp.icp_meta || {}
  const draft = opp.drafts[draftIdx] ?? opp.drafts[0]
  const topSignal = opp.signals[0]
  const callOpener = topSignal
    ? `Saw ${opp.company_name} ${topSignal.evidence.charAt(0).toLowerCase()}${topSignal.evidence.slice(1)}`
    : `${opp.company_name} looks like a strong ICP fit based on live web signals.`
  const objection = opp.score >= 80
    ? 'If timing is the concern, the ask is not a platform rip-and-replace. Start with one same-day signal workflow for new outbound accounts.'
    : 'If this is too early, keep them in a 14-day nurture and trigger only when a second hiring or funding signal appears.'
  const icpLabel = [meta.industry, meta.employees ? `${meta.employees} emp` : null, meta.state]
    .filter(Boolean)
    .join(' · ')

  async function act(type: string, extra?: Record<string, string>) {
    setActionDone(null)
    await onAction(type, extra, draftIdx)
    setActionDone(type)
    setTimeout(() => setActionDone(null), 3000)
  }

  return (
    <Card className={cn('overflow-hidden transition-shadow', expanded && 'shadow-soft ring-1 ring-neutral-200')}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 sm:p-5 hover:bg-neutral-50/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-300"
        aria-expanded={expanded}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-neutral-900 text-base">{opp.company_name}</h3>
              {opp.status === 'approved' && (
                <Badge variant="success">Approved</Badge>
              )}
            </div>
            <p className="text-sm text-neutral-500 truncate">{opp.domain}</p>
            {icpLabel && (
              <p className="text-xs text-neutral-400 mt-1">ICP: {icpLabel}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant={scoreBadgeVariant(opp.score)} className="tabular-nums text-sm px-2.5 py-1">
              Score {Math.round(opp.score)}
            </Badge>
            {opp.buying_window && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                <Zap size={12} />
                {opp.buying_window.days_to_window}d window
              </span>
            )}
            <div className="hidden sm:flex gap-1">
              {opp.signals.slice(0, 3).map((s, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 border border-neutral-200"
                >
                  {SIGNAL_LABELS[s.signal_type] ?? s.signal_type}
                </span>
              ))}
            </div>
            {expanded ? (
              <ChevronUp size={18} className="text-neutral-400 shrink-0" />
            ) : (
              <ChevronDown size={18} className="text-neutral-400 shrink-0" />
            )}
          </div>
        </div>
        {!expanded && opp.buying_window && (
          <p className="text-xs text-neutral-500 mt-2 line-clamp-1 sm:hidden">
            {opp.buying_window.pattern_label}
          </p>
        )}
      </button>

      {expanded && (
        <CardContent className="pt-0 border-t border-neutral-100 space-y-6">
          {timelineLoading ? (
            <div className="h-16 rounded-lg bg-neutral-50 animate-pulse" />
          ) : timeline.length > 0 ? (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                Account timeline
              </h4>
              <div className="relative flex items-start justify-between gap-1 overflow-x-auto pb-1 min-w-0">
                <div className="absolute top-5 left-4 right-4 h-0.5 bg-neutral-200 hidden sm:block" aria-hidden />
                {timeline.map((snap, i) => (
                  <div key={snap.id} className="relative flex flex-col items-center flex-1 min-w-[72px] z-10">
                    <span className="text-[10px] text-neutral-500 mb-2 whitespace-nowrap">
                      {snap.snapshot_at
                        ? new Date(snap.snapshot_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                    </span>
                    <div
                      className={cn(
                        'h-3 w-3 rounded-full border-2 border-white shadow-sm',
                        i === timeline.length - 1 ? 'bg-neutral-900' : 'bg-neutral-300'
                      )}
                    />
                    <span className="text-lg font-semibold text-neutral-900 mt-2 tabular-nums">
                      {Math.round(snap.score)}
                    </span>
                    <span className="text-[10px] text-neutral-500 text-center mt-0.5 line-clamp-2 max-w-[88px] leading-tight">
                      {snap.trigger_label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {(opp.why_now_bullets?.length ?? 0) > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Why now
              </h4>
              <ul className="space-y-2">
                {opp.why_now_bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm text-neutral-700 leading-snug">
                    <span className="text-neutral-300 shrink-0">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              AI SDR playbook
            </h4>
            <div className="grid md:grid-cols-3 gap-3">
              <PlaybookTile
                icon={PhoneCall}
                title="Call opener"
                body={callOpener}
              />
              <PlaybookTile
                icon={MessageSquareText}
                title="LinkedIn nudge"
                body={`Congrats on the ${opp.buying_window?.triggered_pattern?.replaceAll('_', ' ') || 'GTM'} momentum. Worth comparing notes on live signal-led outbound?`}
              />
              <PlaybookTile
                icon={ShieldCheck}
                title="Objection handler"
                body={objection}
              />
            </div>
          </section>

          {opp.signals.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Signal evidence
              </h4>
              <div className="space-y-2">
                {opp.signals.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="muted" className="shrink-0 capitalize">
                        {SIGNAL_LABELS[s.signal_type] ?? s.signal_type}
                      </Badge>
                      {s.source_url && (
                        <a
                          href={s.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-400 hover:text-neutral-700 p-1 -m-1"
                          aria-label="Open source"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    <p className="text-neutral-800 mt-2 leading-relaxed">{s.evidence}</p>
                    <p className="text-xs text-neutral-500 mt-2">
                      <span className="font-medium text-neutral-600">AI:</span> {s.ai_interpretation}
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">
                      +{s.score_impact} score · {Math.round(s.confidence * 100)}% confidence
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {opp.committee.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Buying committee
              </h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {opp.committee.map((st, i) => (
                  <div key={i} className="rounded-lg border border-neutral-200 p-3 bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-9 w-9 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-semibold text-neutral-600">
                        {st.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900 text-sm truncate">{st.name}</p>
                        <p className="text-xs text-neutral-500 truncate">{st.title}</p>
                      </div>
                    </div>
                    <Badge variant="default" className="text-[10px]">
                      {ROLE_LABELS[st.role_in_deal] ?? st.role_in_deal}
                    </Badge>
                    <p className="text-xs text-neutral-600 mt-2 leading-relaxed">{st.hook}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {draft && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Email draft
              </h4>
              {opp.drafts.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {opp.drafts.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDraftIdx(i)}
                      className={cn(
                        'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                        draftIdx === i
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      {d.stakeholder_name}
                    </button>
                  ))}
                </div>
              )}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                <div>
                  <p className="text-[10px] uppercase text-neutral-400 font-medium mb-1">Subject lines</p>
                  {draft.subject_lines?.map((sub, i) => (
                    <p key={i} className="text-sm text-neutral-700">
                      <span className="text-neutral-400 mr-1">{i + 1}.</span>
                      {sub}
                    </p>
                  ))}
                </div>
                <textarea
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                  defaultValue={draft.body}
                  aria-label="Email body"
                />
                <p className="text-xs text-neutral-500">
                  <span className="font-medium text-neutral-700">CTA:</span> {draft.cta}
                </p>
              </div>
            </section>
          )}

          <section className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  One-click workflow
                </h4>
                <p className="text-sm text-neutral-700 mt-1">
                  Approve the AI SDR sequence or route it to the right human owner.
                </p>
              </div>
              <Badge variant={opp.score >= 75 ? 'success' : 'warning'}>
                {opp.score >= 75 ? 'Auto-ready' : 'Review first'}
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <Button
                size="sm"
                disabled={actionBusy}
                onClick={() => act('send_email')}
                className="justify-start"
              >
                {actionBusy ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Send email
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={actionBusy}
                onClick={() => act('create_crm_task', { notes: 'Follow up from CaliSignal SDR' })}
                className="justify-start"
              >
                <ClipboardList size={14} />
                CRM task
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={actionBusy}
                onClick={() => act('send_slack', { notes: `Hot account: ${opp.company_name}` })}
                className="justify-start"
              >
                <CalendarCheck size={14} />
                Slack AE
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={actionBusy}
                onClick={() => navigator.clipboard?.writeText(draft?.body || callOpener)}
                className="justify-start"
              >
                <Copy size={14} />
                Copy script
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 items-center">
              <input
                placeholder="AE name"
                value={aeName}
                onChange={e => setAeName(e.target.value)}
                className="h-8 rounded-lg border border-neutral-200 bg-white px-3 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={actionBusy || !aeName.trim()}
                onClick={() => act('assign_to_ae', { assignee: aeName })}
              >
                <UserPlus size={14} />
                Assign
              </Button>
              <input
                placeholder="Dismiss reason"
                value={dismissReason}
                onChange={e => setDismissReason(e.target.value)}
                className="h-8 rounded-lg border border-neutral-200 bg-white px-3 text-xs flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              />
              <Button
                size="sm"
                variant="danger"
                disabled={actionBusy}
                onClick={() => act('mark_irrelevant', { notes: dismissReason || 'Not relevant' })}
              >
                <Ban size={14} />
                Not relevant
              </Button>
            </div>
            {actionDone && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-700 mt-3">
                <CheckCircle2 size={14} />
                Action recorded successfully
              </p>
            )}
          </section>
        </CardContent>
      )}
    </Card>
  )
}

function PlaybookTile({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon
  title: string
  body: string
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="h-7 w-7 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center">
          <Icon size={14} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{title}</p>
      </div>
      <p className="text-sm text-neutral-700 leading-relaxed">{body}</p>
    </div>
  )
}

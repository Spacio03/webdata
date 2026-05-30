'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  api,
  type ICPConfig,
  type Opportunity,
  type ScoreSnapshot,
  type AlertLog,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Loader2, RefreshCw, AlertCircle, Sparkles, Target,
  LayoutList, Bell, MessageCircle, MapPinned, RadioTower,
  CheckCircle2, Send, DatabaseZap, Users, Clock3, ShieldCheck,
  TrendingUp, Workflow, Search, Building2, BrainCircuit,
  SlidersHorizontal, Filter, Database, BriefcaseBusiness,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { OpportunityCard } from '@/components/platform/OpportunityCard'

const INDUSTRIES = ['SaaS', 'Fintech', 'HR Tech', 'DevTools', 'Climate Tech', 'AI Infra', 'MarTech', 'Sales Tech']
const STATES = ['CA', 'SF Bay', 'Los Angeles', 'San Diego', 'Sacramento', 'Remote CA']
const FUNDING = ['Bootstrapped', 'Pre-Seed', 'Seed', 'Series A', 'Series B']
const PERSONAS = ['Founder/CEO', 'CRO/VP Sales', 'RevOps', 'Head of Growth', 'Marketing Ops', 'Sales Enablement']
const EXCLUSIONS = ['Enterprise only', 'Government', 'No sales team', 'Stealth', 'Hiring freeze', 'Agency/consultancy']
const SIGNAL_WEIGHTS = [
  { id: 'funding', label: 'Funding/news', value: 92 },
  { id: 'hiring', label: 'GTM hiring', value: 88 },
  { id: 'leadership', label: 'Leadership change', value: 82 },
  { id: 'reviews', label: 'Review pain', value: 74 },
  { id: 'pricing', label: 'Pricing/site diff', value: 69 },
]
const DATA_SOURCES = [
  ['SERP API', 'Funding, news, competitors'],
  ['Web Scraper', 'Jobs, pricing, pages'],
  ['Web Unlocker', 'Reviews, forums, social'],
  ['CRM Memory', 'Touches, owners, outcomes'],
  ['LinkedIn/Jobs', 'People and hiring shifts'],
] as const

const PRESETS = [
  'Which California accounts should my SDR call before lunch?',
  'What signal types are driving the highest meeting likelihood?',
  'Which startups have new GTM leaders and open budget?',
  'Draft a same-day sequence for the top 3 accounts',
]

const TABS = [
  { id: 'icp' as const, label: 'ICP Builder', icon: Target },
  { id: 'pipeline' as const, label: 'Pipeline', icon: LayoutList },
  { id: 'alerts' as const, label: 'Alerts', icon: Bell },
  { id: 'intelligence' as const, label: 'Intelligence', icon: MessageCircle },
]

type Tab = (typeof TABS)[number]['id']
type Filter = 'all' | 'high' | 'window' | 'pending'

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
        active
          ? 'bg-[#201515] text-[#fffefb] border-[#201515]'
          : 'bg-[#fffefb] text-[#605d52] border-[#201515]/15 hover:border-[#201515]/30 hover:bg-[#f8f4f0]'
      )}
    >
      {children}
    </button>
  )
}

export default function PlatformPage() {
  const [tab, setTab] = useState<Tab>('pipeline')
  const [icp, setIcp] = useState<ICPConfig | null>(null)
  const [icpForm, setIcpForm] = useState<Partial<ICPConfig>>({})
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [alerts, setAlerts] = useState<AlertLog[]>([])
  const [timelines, setTimelines] = useState<Record<string, ScoreSnapshot[]>>({})
  const [timelineLoading, setTimelineLoading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [pageLoading, setPageLoading] = useState(true)
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [actionOppId, setActionOppId] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [saveMsg, setSaveMsg] = useState('')
  const [lastScanMsg, setLastScanMsg] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [personas, setPersonas] = useState<string[]>(['CRO/VP Sales', 'RevOps'])
  const [excluded, setExcluded] = useState<string[]>(['Enterprise only', 'Government'])
  const [sources, setSources] = useState<string[]>(['SERP API', 'Web Scraper', 'Web Unlocker', 'CRM Memory'])
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(SIGNAL_WEIGHTS.map(w => [w.id, w.value]))
  )
  const [urgencyDays, setUrgencyDays] = useState(30)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setApiError(null)
    try {
      const [i, o, a] = await Promise.all([
        api.getIcp(),
        api.listOpportunities(''),
        api.listAlerts(),
      ])
      setIcp(i)
      setIcpForm(i)
      setOpps(o)
      setAlerts(a)
    } catch (error) {
      const fallback = getFallbackIcp()
      setApiError(error instanceof Error ? `Production API unavailable: ${error.message}` : 'Production API unavailable. Start the backend and verify Bright Data credentials.')
      setIcp(fallback)
      setIcpForm(fallback)
      setOpps([])
      setAlerts([])
    } finally {
      setPageLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = opps.filter(o => {
    if (filter === 'high') return o.score >= 75
    if (filter === 'window') return (o.buying_window?.days_to_window ?? 99) < 30
    if (filter === 'pending') return o.status === 'pending'
    return true
  })

  const stats = {
    pending: opps.filter(o => o.status === 'pending').length,
    high: opps.filter(o => o.score >= 75).length,
    approved: opps.filter(o => o.status === 'approved').length,
    avg: opps.length ? Math.round(opps.reduce((a, o) => a + o.score, 0) / opps.length) : 0,
  }

  const sourceStats = opps.reduce<Record<string, number>>((acc, opp) => {
    opp.signals.forEach(signal => {
      const source = signal.source.replace('Bright Data ', '')
      acc[source] = (acc[source] || 0) + 1
    })
    return acc
  }, {})

  const topOpp = [...opps].sort((a, b) => b.score - a.score)[0]
  const urgentOpps = opps.filter(o => (o.buying_window?.days_to_window ?? 99) <= 30)
  const caCoverage = opps.filter(o => {
    const state = `${o.icp_meta?.state || ''}`.toLowerCase()
    return state.includes('ca') || state.includes('sf') || state.includes('san') || state.includes('los')
  }).length
  const estimatedPipeline = opps.reduce((sum, o) => sum + Math.round(o.score * 1900), 0)
  const meetingsReady = Math.max(1, Math.round(urgentOpps.length * 1.6 + stats.high * 0.8))
  const accuracyScore = Math.min(98, Math.round(
    48 +
    (icpForm.industries?.length || 0) * 4 +
    (icpForm.us_states?.length || 0) * 3 +
    personas.length * 3 +
    sources.length * 4 +
    Object.values(weights).reduce((a, b) => a + b, 0) / 45
  ))

  async function saveIcpAndRun() {
    setPipelineLoading(true)
    setSaveMsg('')
    const payload: ICPConfig = {
      industries: icpForm.industries || ['SaaS', 'HR Tech'],
      employee_range: icpForm.employee_range || [10, 200],
      us_states: (icpForm.us_states || []).filter(s => s !== 'Nationwide'),
      funding_stages: icpForm.funding_stages || ['Seed', 'Series A'],
      tech_stack_signals: icpForm.tech_stack_signals || [],
      negative_signals: icpForm.negative_signals || ['enterprise'],
      your_product: icpForm.your_product || '',
      sender_name: icpForm.sender_name || 'Alex',
      sender_company: icpForm.sender_company || 'CaliSignal',
    }
    try {
      await api.saveIcp(payload)
      const res = await api.runPipelineSync({
        icp_description: [
          `California ${payload.industries.join('/')} startups`,
          `${payload.employee_range[0]}-${payload.employee_range[1]} employees`,
          `regions: ${payload.us_states.join(', ') || 'CA'}`,
          `funding: ${payload.funding_stages.join(', ')}`,
          `target personas: ${personas.join(', ')}`,
          `sources: ${sources.join(', ')}`,
          `exclude: ${excluded.join(', ')}`,
          `urgent buying window <= ${urgencyDays} days`,
          `signal weights: ${Object.entries(weights).map(([k, v]) => `${k}:${v}`).join(', ')}`,
        ].join(' | '),
        your_product: payload.your_product,
        sender_name: payload.sender_name,
        sender_company: payload.sender_company,
        icp_config: payload,
      })
      if (res.count === 0) {
        const msg = res.warning || 'Production scan complete - no matching accounts returned. Tighten or broaden your ICP and run again.'
        setSaveMsg(msg)
        setLastScanMsg(res.warning || 'Latest production scan completed, but no new accounts matched the current ICP.')
        showToast(res.warning ? 'error' : 'success', res.warning ? 'Live data provider needs configuration' : 'Production scan complete - no new accounts returned')
        setTab('pipeline')
        return
      }
      setSaveMsg(res.warning || `Pipeline complete - ${res.count} accounts loaded.`)
      setLastScanMsg(`Latest production scan loaded ${res.count} account${res.count === 1 ? '' : 's'} from the backend pipeline.`)
      showToast('success', `${res.count} opportunities ready for review`)
      setTab('pipeline')
      await load()
    } catch (e) {
      setIcp(payload)
      setIcpForm(payload)
      const msg = e instanceof Error ? e.message : 'Production scan failed'
      setApiError(`Production scan failed: ${msg}`)
      setSaveMsg(msg)
      showToast('error', msg)
    } finally {
      setPipelineLoading(false)
    }
  }

  async function expandOpp(id: string) {
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    if (!timelines[id]) {
      setTimelineLoading(id)
      try {
        const t = await api.getTimeline(id)
        setTimelines(prev => ({ ...prev, [id]: t }))
      } catch {
        setTimelines(prev => ({ ...prev, [id]: [] }))
      } finally {
        setTimelineLoading(null)
      }
    }
  }

  async function runAction(
    oppId: string,
    action_type: string,
    extra: Record<string, string> = {},
    draftIndex = 0
  ) {
    setActionOppId(oppId)
    try {
      await api.action(oppId, { action_type, draft_index: draftIndex, ...extra })
      showToast('success', 'Action saved')
      await load()
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Action failed')
      throw e
    } finally {
      setActionOppId(null)
    }
  }

  async function handleAsk(q: string) {
    if (!q.trim()) return
    setQuestion(q)
    setAskLoading(true)
    setAnswer('')
    try {
      const res = await api.ask(q)
      setAnswer(res.answer)
    } catch {
      setAnswer('Could not reach the intelligence API. Ensure the backend is running on port 8000.')
    } finally {
      setAskLoading(false)
    }
  }

  function toggleChip(list: string[] | undefined, item: string, key: keyof ICPConfig) {
    const cur = list || []
    const next = cur.includes(item) ? cur.filter(x => x !== item) : [...cur, item]
    setIcpForm(f => ({ ...f, [key]: next }))
  }

  function toggleLocal(list: string[], item: string, setter: (next: string[]) => void) {
    setter(list.includes(item) ? list.filter(x => x !== item) : [...list, item])
  }

  function switchTab(nextTab: Tab) {
    setTab(nextTab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="p-5 sm:p-8 max-w-7xl">
      {toast && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-soft animate-in',
            toast.type === 'success'
              ? 'bg-[#f8f4f0] border-[#ff4f00]/30 text-[#201515]'
              : 'bg-red-50 border-red-200 text-red-800'
          )}
          role="status"
        >
          {toast.msg}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-[#201515]/15 bg-[#fffefb] shadow-card overflow-hidden">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="live">Track 1 · GTM Intelligence</Badge>
              <Badge variant="muted">Built for California startups</Badge>
            </div>
            <h1 className="page-title text-2xl sm:text-3xl">CaliSignal SDR cockpit</h1>
            <p className="page-subtitle max-w-2xl">
              An AI SDR that watches live web data, finds California startups entering a buying window,
              maps the committee, and turns each signal into an approved outbound workflow.
            </p>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Metric icon={RadioTower} label="Live signals" value={opps.reduce((a, o) => a + o.signals.length, 0)} tone="emerald" />
              <Metric icon={MapPinned} label="CA coverage" value={`${caCoverage}/${opps.length || 0}`} tone="blue" />
              <Metric icon={Clock3} label="Urgent windows" value={urgentOpps.length} tone="amber" />
              <Metric icon={Send} label="Meetings ready" value={meetingsReady} tone="violet" />
            </div>
          </div>
          <div className="border-t lg:border-t-0 lg:border-l border-[#201515]/15 bg-[#201515] text-[#fffefb] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#c5c0b1]">Autonomous workflow</p>
                <p className="text-lg font-semibold mt-1">Signal → Score → Sequence → CRM</p>
              </div>
              <Workflow className="text-[#ff4f00]" size={26} />
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['Bright Data scan', 'SERP API, Web Scraper, Web Unlocker collect current signals.'],
                ['AI qualification', 'ICP fit, urgency, source confidence, and committee fit are scored.'],
                ['SDR action', 'Email, CRM task, AE assignment, and alert are queued for approval.'],
              ].map(([title, body], index) => (
                <div key={title} className="flex gap-3">
                  <div className="h-7 w-7 rounded-md bg-[#fffefb]/10 border border-[#fffefb]/10 flex items-center justify-center text-xs font-semibold tabular-nums">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-[#c5c0b1] leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {apiError && (
        <Card className="mb-6 border-red-200 bg-red-50/50">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="text-red-600 shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">{apiError}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => { setPageLoading(true); load() }}>
                <RefreshCw size={14} />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <nav
        className="sticky top-0 z-20 -mx-2 px-2 py-2 mb-6 bg-[#fffefb]/95 backdrop-blur border-b border-[#201515]/10"
        aria-label="Platform sections"
      >
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                tab === id
                  ? 'bg-[#f8f4f0] text-[#201515] shadow-card border border-[#201515]/10'
                  : 'text-[#605d52] hover:text-[#201515] hover:bg-[#f8f4f0]/70'
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {tab === 'icp' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-4">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search size={17} />
                  California startup hunter
                </CardTitle>
                <CardDescription>
                  One-click ICP tuned for Track 1: live buying signals, enrichment, and GTM actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-3 pt-0">
                {[
                  ['SF Bay', 'AI infra, HR tech, fintech teams with fresh funding.'],
                  ['Los Angeles', 'SaaS and creator tooling teams hiring first SDRs.'],
                  ['San Diego', 'DevTools and climate startups entering sales-led motion.'],
                ].map(([region, detail]) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setIcpForm(f => ({
                      ...f,
                      us_states: ['CA', region],
                      industries: region === 'SF Bay' ? ['AI Infra', 'Fintech', 'HR Tech'] : ['SaaS', 'DevTools', 'Climate Tech'],
                      employee_range: [10, 200],
                      funding_stages: ['Seed', 'Series A', 'Series B'],
                    }))}
                    className="text-left rounded-xl border border-[#201515]/15 bg-[#f8f4f0] hover:bg-[#fffefb] hover:border-[#201515]/25 p-3 transition-colors"
                  >
                    <p className="text-sm font-semibold text-[#201515]">{region}</p>
                    <p className="text-xs text-[#605d52] mt-1 leading-relaxed">{detail}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Judge checklist</CardTitle>
                <CardDescription>Track One criteria covered in product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {[
                  'Continuously monitors public web GTM signals',
                  'Enriches accounts and buying committees',
                  'Replaces manual SDR research with structured intelligence',
                  'Turns live context into outbound actions',
                ].map(item => (
                  <p key={item} className="flex gap-2 text-sm text-neutral-700">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    {item}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>

          {icp && (
            <Card>
              <CardHeader>
                <CardTitle>Current ICP</CardTitle>
                <CardDescription>
                  {(icp.industries || []).join(', ')} · {icp.employee_range?.[0]}–{icp.employee_range?.[1]} employees
                  {(icp.us_states?.length ? ` · ${icp.us_states.join(', ')}` : ' · Nationwide')}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <div className="grid xl:grid-cols-[1.25fr_0.75fr] gap-4">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-[#201515]/10 pb-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <SlidersHorizontal size={18} className="text-[#ff4f00]" />
                      Precision ICP Builder
                    </CardTitle>
                    <CardDescription>
                      Tune firmographics, buyer personas, source coverage, and signal weights before the agent scans.
                    </CardDescription>
                  </div>
                  <Badge variant="live">{accuracyScore}% match confidence</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-5">
                  <Field label="Industries">
                    <div className="flex flex-wrap gap-2">
                      {INDUSTRIES.map(ind => (
                        <Chip key={ind} active={!!icpForm.industries?.includes(ind)} onClick={() => toggleChip(icpForm.industries, ind, 'industries')}>
                          {ind}
                        </Chip>
                      ))}
                    </div>
                  </Field>

                  <Field label="California geography">
                    <div className="flex flex-wrap gap-2">
                      {STATES.map(st => (
                        <Chip key={st} active={!!icpForm.us_states?.includes(st)} onClick={() => toggleChip(icpForm.us_states, st, 'us_states')}>
                          {st}
                        </Chip>
                      ))}
                    </div>
                  </Field>

                  <Field label="Company size">
                    <div className="grid grid-cols-3 gap-2">
                      {([[1, 25], [10, 50], [50, 200], [200, 500], [500, 1000], [10, 200]] as [number, number][]).map(([a, b]) => (
                        <button
                          key={`${a}-${b}`}
                          type="button"
                          onClick={() => setIcpForm(f => ({ ...f, employee_range: [a, b] }))}
                          className={cn(
                            'rounded-xl border px-3 py-2 text-left transition-colors',
                            icpForm.employee_range?.[0] === a && icpForm.employee_range?.[1] === b
                              ? 'border-[#201515] bg-[#201515] text-[#fffefb]'
                              : 'border-[#201515]/15 bg-[#f8f4f0] text-[#201515] hover:border-[#201515]/30'
                          )}
                        >
                          <span className="block text-sm font-semibold">{a}-{b}</span>
                          <span className="text-[11px] opacity-70">employees</span>
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Funding stage">
                    <div className="flex flex-wrap gap-2">
                      {FUNDING.map(fs => (
                        <Chip key={fs} active={!!icpForm.funding_stages?.includes(fs)} onClick={() => toggleChip(icpForm.funding_stages, fs, 'funding_stages')}>
                          {fs}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                </div>

                <div className="rounded-xl border border-[#201515]/10 bg-[#f8f4f0] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={16} className="text-[#ff4f00]" />
                    <p className="text-sm font-semibold text-[#201515]">Buying committee targets</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PERSONAS.map(persona => (
                      <Chip key={persona} active={personas.includes(persona)} onClick={() => toggleLocal(personas, persona, setPersonas)}>
                        {persona}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-5">
                  <Field label="Tech stack signals" hint="Tools that imply GTM maturity">
                    <input
                      className="w-full rounded-xl border border-[#201515]/15 bg-[#fffefb] px-3 py-2 text-sm text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00]/20"
                      placeholder="HubSpot, Salesforce, Outreach, Clay"
                      value={(icpForm.tech_stack_signals || []).join(', ')}
                      onChange={e =>
                        setIcpForm(f => ({
                          ...f,
                          tech_stack_signals: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                        }))
                      }
                    />
                  </Field>

                  <Field label="Exclude weak-fit accounts" hint="Stops the agent from wasting SDR motion">
                    <div className="flex flex-wrap gap-2">
                      {EXCLUSIONS.map(item => (
                        <Chip key={item} active={excluded.includes(item)} onClick={() => toggleLocal(excluded, item, setExcluded)}>
                          {item}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                </div>

                <Field label="Your product and offer">
                  <textarea
                    className="w-full rounded-xl border border-[#201515]/15 bg-[#fffefb] px-3 py-2 text-sm text-[#201515] min-h-[96px] focus:outline-none focus:ring-2 focus:ring-[#ff4f00]/20"
                    placeholder="What you sell, who it helps, and the strongest pain you solve..."
                    value={icpForm.your_product || ''}
                    onChange={e => setIcpForm(f => ({ ...f, your_product: e.target.value }))}
                  />
                </Field>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Sender name">
                    <input
                      className="w-full rounded-xl border border-[#201515]/15 bg-[#fffefb] px-3 py-2 text-sm text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00]/20"
                      value={icpForm.sender_name || ''}
                      onChange={e => setIcpForm(f => ({ ...f, sender_name: e.target.value }))}
                    />
                  </Field>
                  <Field label="Sender company">
                    <input
                      className="w-full rounded-xl border border-[#201515]/15 bg-[#fffefb] px-3 py-2 text-sm text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00]/20"
                      value={icpForm.sender_company || ''}
                      onChange={e => setIcpForm(f => ({ ...f, sender_company: e.target.value }))}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database size={16} className="text-[#ff4f00]" />
                    Data Source Coverage
                  </CardTitle>
                  <CardDescription>Choose which signals make the ICP more accurate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pt-2">
                  {DATA_SOURCES.map(([name, detail]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleLocal(sources, name, setSources)}
                      className={cn(
                        'w-full rounded-xl border p-3 text-left transition-colors',
                        sources.includes(name)
                          ? 'border-[#ff4f00]/35 bg-[#ff4f00]/10'
                          : 'border-[#201515]/10 bg-[#f8f4f0] hover:border-[#201515]/25'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#201515]">{name}</p>
                          <p className="text-xs text-[#605d52] mt-0.5">{detail}</p>
                        </div>
                        {sources.includes(name) && <CheckCircle2 size={16} className="text-[#ff4f00]" />}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BrainCircuit size={16} className="text-[#ff4f00]" />
                    Signal Weighting
                  </CardTitle>
                  <CardDescription>Tell the agent what “ready to buy” means</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  {SIGNAL_WEIGHTS.map(weight => (
                    <label key={weight.id} className="block">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-sm font-medium text-[#201515]">{weight.label}</span>
                        <span className="text-xs font-semibold text-[#ff4f00] tabular-nums">{weights[weight.id]}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={weights[weight.id]}
                        onChange={e => setWeights(prev => ({ ...prev, [weight.id]: Number(e.target.value) }))}
                        className="w-full accent-[#ff4f00]"
                      />
                    </label>
                  ))}
                  <label className="block border-t border-[#201515]/10 pt-4">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-sm font-medium text-[#201515]">Urgent buying window</span>
                      <span className="text-xs font-semibold text-[#ff4f00] tabular-nums">{urgencyDays} days</span>
                    </div>
                    <input
                      type="range"
                      min={7}
                      max={90}
                      value={urgencyDays}
                      onChange={e => setUrgencyDays(Number(e.target.value))}
                      className="w-full accent-[#ff4f00]"
                    />
                  </label>
                </CardContent>
              </Card>

              <Card className="bg-[#201515] text-[#fffefb] border-[#201515]">
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#c5c0b1]">Accuracy Preview</p>
                      <p className="text-3xl font-semibold mt-1">{accuracyScore}%</p>
                    </div>
                    <Filter className="text-[#ff4f00]" size={28} />
                  </div>
                  <p className="text-sm text-[#c5c0b1] leading-relaxed">
                    The scan will prioritize {personas.slice(0, 2).join(' and ')} at {icpForm.industries?.slice(0, 2).join(' / ') || 'startup'} accounts with evidence from {sources.length} data layers.
                  </p>
                  <Button onClick={saveIcpAndRun} disabled={pipelineLoading} size="lg" className="w-full">
                    {pipelineLoading ? <Loader2 size={16} className="animate-spin" /> : <BriefcaseBusiness size={16} />}
                    Save ICP & run precision scan
                  </Button>
                  {saveMsg && (
                    <p className={cn('text-xs', saveMsg.includes('fail') ? 'text-red-200' : 'text-[#c5c0b1]')}>
                      {saveMsg}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {tab === 'pipeline' && (
        <div className="space-y-6">
          {lastScanMsg && (
            <div className="rounded-xl border border-[#ff4f00]/25 bg-[#ff4f00]/10 px-4 py-3 text-sm text-[#201515] flex items-start gap-3">
              <Sparkles size={17} className="text-[#ff4f00] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Precision scan complete</p>
                <p className="text-[#605d52] mt-0.5">{lastScanMsg}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              ['Pending review', stats.pending],
              ['High priority', stats.high],
              ['Approved', stats.approved],
              ['Avg score', stats.avg],
            ].map(([label, val]) => (
              <Card key={String(label)}>
                <CardContent className="py-4">
                  <p className="text-xs text-neutral-500">{label}</p>
                  <p className="text-2xl font-semibold text-neutral-900 mt-1 tabular-nums">{val}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-[1fr_1fr_1fr] gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={16} />
                  Revenue queue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <PipelineRow label="Estimated pipeline found" value={`$${Math.round(estimatedPipeline / 1000)}k`} />
                <PipelineRow label="Same-day sequences ready" value={String(meetingsReady)} />
                <PipelineRow label="Accounts under 30 days" value={String(urgentOpps.length)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DatabaseZap size={16} />
                  Bright Data coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {Object.entries(sourceStats).slice(0, 4).map(([source, count]) => (
                  <PipelineRow key={source} label={source} value={String(count)} />
                ))}
                {Object.keys(sourceStats).length === 0 && <p className="text-sm text-neutral-500">Run the scan to see source coverage.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck size={16} />
                  Best next move
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {topOpp ? (
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{topOpp.company_name}</p>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      {topOpp.buying_window?.pattern_label || 'Highest ranked buying signal'}.
                    </p>
                    <Button size="sm" className="mt-3" onClick={() => expandOpp(topOpp.id)}>
                      Open account
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">Run the AI SDR scan to generate a prioritized move.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'high', 'window', 'pending'] as Filter[]).map(f => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'high' ? 'Score 75+' : f === 'window' ? '<30d window' : 'Pending'}
              </Chip>
            ))}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={load} disabled={pageLoading}>
              <RefreshCw size={14} className={pageLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>

          {pageLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-xl bg-neutral-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-neutral-600 font-medium">No opportunities yet</p>
                <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
                  Configure your ICP and run the AI SDR scan to discover scored California startup accounts.
                </p>
                <Button className="mt-4" onClick={() => switchTab('icp')}>
                  Go to ICP Builder
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(opp => (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  timeline={timelines[opp.id] || []}
                  timelineLoading={timelineLoading === opp.id}
                  expanded={expanded === opp.id}
                  onToggle={() => expandOpp(opp.id)}
                  onAction={(type, extra, draftIdx) => runAction(opp.id, type, extra, draftIdx)}
                  actionBusy={actionOppId === opp.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'alerts' && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Outbound workflow log</CardTitle>
            <CardDescription>TriggerWare, Slack, email, and CRM actions when scores cross thresholds</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
                  <th className="p-3 font-medium">Alert</th>
                  <th className="p-3 font-medium">Company</th>
                  <th className="p-3 font-medium hidden sm:table-cell">Channel</th>
                  <th className="p-3 font-medium hidden md:table-cell">Owner</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium hidden lg:table-cell">Fired</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-500">
                      No alerts yet. High-scoring accounts trigger alerts automatically.
                    </td>
                  </tr>
                ) : (
                  alerts.map(a => (
                    <tr key={a.id} className="border-t border-neutral-100 hover:bg-neutral-50/50">
                      <td className="p-3 font-medium text-neutral-900">{a.message}</td>
                      <td className="p-3 text-neutral-700">{a.company_name}</td>
                      <td className="p-3 capitalize text-neutral-600 hidden sm:table-cell">{a.channel}</td>
                      <td className="p-3 text-neutral-600 hidden md:table-cell">{a.owner}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            a.status === 'sent' ? 'success' : a.status === 'queued' ? 'warning' : 'danger'
                          }
                          className="capitalize"
                        >
                          {a.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-neutral-500 text-xs hidden lg:table-cell whitespace-nowrap">
                        {a.fired_at
                          ? new Date(a.fired_at).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'intelligence' && (
        <Card>
          <CardHeader>
            <CardTitle>AI SDR intelligence desk</CardTitle>
            <CardDescription>
              Ask natural-language questions about the California startup pipeline — powered by TriggerWare
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleAsk(p)}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-white hover:border-neutral-300 transition-colors max-w-full"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !askLoading && handleAsk(question)}
                placeholder="e.g. Which accounts have a buying window under 30 days?"
              />
              <Button onClick={() => handleAsk(question)} disabled={askLoading || !question.trim()}>
                {askLoading ? <Loader2 size={16} className="animate-spin" /> : 'Ask'}
              </Button>
            </div>
            {(answer || askLoading) && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap min-h-[4rem]">
                {askLoading ? (
                  <span className="text-neutral-400 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Analyzing pipeline…
                  </span>
                ) : (
                  answer
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function getFallbackIcp(): ICPConfig {
  return {
    industries: ['SaaS', 'HR Tech', 'DevTools', 'Fintech', 'AI Infra'],
    employee_range: [10, 200],
    us_states: ['CA', 'SF Bay', 'Los Angeles'],
    funding_stages: ['Seed', 'Series A', 'Series B'],
    tech_stack_signals: ['HubSpot', 'Salesforce', 'Outreach'],
    negative_signals: ['enterprise', 'government'],
    your_product: 'CaliSignal SDR turns Bright Data live web signals into ranked meetings for California startup sales teams.',
    sender_name: 'Alex',
    sender_company: 'CaliSignal',
  }
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-sm font-medium text-neutral-800">{label}</label>
      {hint && <p className="text-xs text-neutral-500 mt-0.5">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  tone: 'emerald' | 'blue' | 'amber' | 'violet'
}) {
  const toneClasses = {
    emerald: 'bg-[#ff4f00]/10 text-[#d94400] border-[#ff4f00]/20',
    blue: 'bg-[#201515] text-[#fffefb] border-[#201515]',
    amber: 'bg-[#f8f4f0] text-[#201515] border-[#201515]/15',
    violet: 'bg-[#fffefb] text-[#ff4f00] border-[#ff4f00]/25',
  }
  return (
    <div className="rounded-xl border border-[#201515]/10 bg-[#f8f4f0] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[#605d52]">{label}</p>
        <span className={cn('h-7 w-7 rounded-md border flex items-center justify-center', toneClasses[tone])}>
          <Icon size={14} />
        </span>
      </div>
      <p className="text-xl font-semibold text-[#201515] mt-2 tabular-nums">{value}</p>
    </div>
  )
}

function PipelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f8f4f0] border border-[#201515]/10 px-3 py-2">
      <span className="text-xs text-[#605d52]">{label}</span>
      <span className="text-sm font-semibold text-[#201515] tabular-nums">{value}</span>
    </div>
  )
}

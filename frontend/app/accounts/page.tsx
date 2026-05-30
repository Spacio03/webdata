'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Activity, ArrowUpRight, Bot, BriefcaseBusiness, CheckCircle2,
  DatabaseZap, Filter, GitBranch, Globe2, Mail, MessageSquare,
  MousePointerClick, PlugZap, RadioTower, Search, Send, ShieldCheck,
  Sparkles, Users, Workflow,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AccountCard } from '@/components/signalforge/AccountCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { accounts, aiActions, brightDataIntegrations, competitorAlerts } from '@/lib/mock-data'

const platformSources = [
  { name: 'Bright Data Web Scraper', detail: 'Jobs, pricing, landing pages', count: 1842, icon: DatabaseZap },
  { name: 'SERP API', detail: 'News, funding, competitor pages', count: 624, icon: Search },
  { name: 'Web Unlocker', detail: 'Reviews, forums, social proof', count: 412, icon: Globe2 },
  { name: 'CRM + Email', detail: 'Touches, owners, sequences', count: 936, icon: Mail },
  { name: 'Slack + Calendar', detail: 'Alerts, handoffs, meeting sync', count: 188, icon: MessageSquare },
  { name: 'LinkedIn + Jobs', detail: 'Leadership and hiring movement', count: 771, icon: BriefcaseBusiness },
]

const agentTools = [
  { name: 'Scout Agent', job: 'Finds new California startups and enriches firmographics.', icon: RadioTower, status: 'running' },
  { name: 'Signal Diff Agent', job: 'Compares pages, job boards, pricing, and reviews every scan.', icon: GitBranch, status: 'running' },
  { name: 'Committee Agent', job: 'Maps buyers, champions, blockers, and personal hooks.', icon: Users, status: 'ready' },
  { name: 'Sequence Agent', job: 'Writes email, LinkedIn, call opener, and objection handling.', icon: Send, status: 'ready' },
  { name: 'CRM Agent', job: 'Updates HubSpot or Salesforce fields, tasks, and owner routing.', icon: PlugZap, status: 'ready' },
  { name: 'Autopilot Guard', job: 'Blocks low-confidence actions and requires human approval.', icon: ShieldCheck, status: 'watching' },
]

const workflowSteps = [
  'Discover startups',
  'Aggregate live web data',
  'Score buying window',
  'Map committee',
  'Draft outreach',
  'Push to CRM',
  'Alert owner',
]

const statusOrder = ['hot', 'warming', 'engaged', 'dormant']
const sortedAccounts = [...accounts].sort((a, b) => {
  const statusDelta = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  return statusDelta || b.intentScore - a.intentScore
})

const hotAccounts = accounts.filter(account => account.status === 'hot')
const totalSignals = accounts.reduce((sum, account) => sum + account.signals.length, 0)
const avgIntent = Math.round(accounts.reduce((sum, account) => sum + account.intentScore, 0) / accounts.length)
const sourceTotal = platformSources.reduce((sum, source) => sum + source.count, 0)

export default function AccountsPage() {
  return (
    <AppShell>
      <div className="p-6 sm:p-8 max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <section className="rounded-xl border border-[#201515]/15 bg-[#fffefb] overflow-hidden shadow-card">
            <div className="grid xl:grid-cols-[1.15fr_0.85fr]">
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge variant="live">Aggregator OS</Badge>
                  <Badge variant="muted">All accounts · all platforms · all agents</Badge>
                </div>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-normal text-[#201515]">
                  Account intelligence aggregator
                </h1>
                <p className="mt-3 max-w-2xl text-[#605d52] leading-relaxed">
                  CaliSignal pulls live web signals, CRM context, social proof, job posts, reviews,
                  competitor moves, Slack alerts, and email history into one agentic SDR workspace.
                </p>
                <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Metric label="Accounts tracked" value={accounts.length} />
                  <Metric label="Live signals" value={totalSignals} />
                  <Metric label="Hot accounts" value={hotAccounts.length} />
                  <Metric label="Avg intent" value={avgIntent} />
                </div>
              </div>
              <div className="bg-[#201515] text-[#fffefb] p-6 sm:p-8">
                <p className="text-xs uppercase tracking-wider text-[#c5c0b1]">Autonomous account loop</p>
                <div className="mt-5 space-y-3">
                  {workflowSteps.map((step, index) => (
                    <div key={step} className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-lg border border-[#fffefb]/10 bg-[#fffefb]/10 flex items-center justify-center text-xs tabular-nums">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{step}</p>
                        <div className="mt-2 h-1.5 rounded-full bg-[#fffefb]/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#ff4f00]"
                            style={{ width: `${62 + index * 5}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid xl:grid-cols-[1.25fr_0.75fr] gap-6">
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#201515]">All Aggregated Accounts</h2>
                  <p className="text-sm text-[#605d52]">Ranked by intent, urgency, source confidence, and actionability.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm"><Sparkles size={14} /> Run agents</Button>
                  <Button size="sm" variant="outline"><Filter size={14} /> Filter</Button>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-3">
                {sortedAccounts.map((account, index) => (
                  <AccountCard key={account.id} account={account} index={index} />
                ))}
              </div>
            </section>

            <aside className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity size={16} />
                    Source Aggregation
                  </CardTitle>
                  <CardDescription>Signals blended from live web and GTM platforms</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {platformSources.map(source => {
                    const Icon = source.icon
                    return (
                      <div key={source.name} className="rounded-xl border border-[#201515]/10 bg-[#f8f4f0] p-3">
                        <div className="flex items-center gap-3">
                          <span className="h-9 w-9 rounded-lg bg-[#fffefb] border border-[#201515]/10 flex items-center justify-center text-[#ff4f00]">
                            <Icon size={16} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#201515] truncate">{source.name}</p>
                            <p className="text-xs text-[#605d52]">{source.detail}</p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">{source.count}</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-[#fffefb] overflow-hidden border border-[#201515]/10">
                          <div
                            className="h-full rounded-full bg-[#ff4f00]"
                            style={{ width: `${Math.max(12, (source.count / sourceTotal) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow size={16} />
                    Integration Actions
                  </CardTitle>
                  <CardDescription>What the agents can perform after scoring</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 pt-2">
                  {[
                    ['Salesforce', 'Update score'],
                    ['HubSpot', 'Create task'],
                    ['Slack', 'Alert AE'],
                    ['Gmail', 'Draft email'],
                    ['Outreach', 'Start sequence'],
                    ['Calendar', 'Book slot'],
                  ].map(([name, action]) => (
                    <div key={name} className="rounded-xl border border-[#201515]/10 bg-[#f8f4f0] p-3">
                      <p className="text-sm font-semibold text-[#201515]">{name}</p>
                      <p className="text-xs text-[#605d52] mt-1">{action}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </aside>
          </div>

          <section className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot size={16} />
                  Agentic Toolbench
                </CardTitle>
                <CardDescription>Specialized agents working together before an SDR touches the account</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3 pt-2">
                {agentTools.map(tool => {
                  const Icon = tool.icon
                  return (
                    <div key={tool.name} className="rounded-xl border border-[#201515]/10 bg-[#f8f4f0] p-4">
                      <div className="flex items-start gap-3">
                        <span className="h-10 w-10 rounded-xl bg-[#201515] text-[#fffefb] flex items-center justify-center">
                          <Icon size={17} />
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-[#201515]">{tool.name}</p>
                            <Badge variant={tool.status === 'running' ? 'live' : 'muted'}>{tool.status}</Badge>
                          </div>
                          <p className="text-xs text-[#605d52] leading-relaxed mt-1">{tool.job}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MousePointerClick size={16} />
                  Ready To Perform
                </CardTitle>
                <CardDescription>Pending agent actions across accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {aiActions.slice(0, 4).map(action => (
                  <Link
                    key={action.id}
                    href="/actions"
                    className="block rounded-xl border border-[#201515]/10 bg-[#f8f4f0] p-3 hover:border-[#ff4f00]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#201515]">{action.accountName}</p>
                        <p className="text-xs text-[#605d52] mt-1 line-clamp-2">{action.title}</p>
                      </div>
                      <ArrowUpRight size={14} className="text-[#939084]" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid lg:grid-cols-[0.85fr_1.15fr] gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlugZap size={16} />
                  Bright Data Infrastructure
                </CardTitle>
                <CardDescription>Live web data products powering the aggregator</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                {brightDataIntegrations.map(integration => (
                  <div key={integration.name} className="flex items-center justify-between rounded-xl border border-[#201515]/10 bg-[#f8f4f0] px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-[#201515]">{integration.name}</p>
                      <p className="text-xs text-[#605d52]">{integration.signals.toLocaleString()} signals · {integration.latency}</p>
                    </div>
                    <Badge variant="live">{integration.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Competitor + Market Movement Layer
                </CardTitle>
                <CardDescription>Signals that change account messaging automatically</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3 pt-2">
                {competitorAlerts.slice(0, 4).map(alert => (
                  <div key={alert.id} className="rounded-xl border border-[#201515]/10 bg-[#f8f4f0] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#201515]">{alert.competitor}</p>
                      <Badge variant={alert.severity === 'high' ? 'hot' : 'muted'}>{alert.severity}</Badge>
                    </div>
                    <p className="text-xs font-medium text-[#201515] mt-2">{alert.title}</p>
                    <p className="text-xs text-[#605d52] mt-1 line-clamp-2">{alert.summary}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </motion.div>
      </div>
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#201515]/10 bg-[#f8f4f0] p-4">
      <p className="text-xs text-[#605d52]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[#201515]">{value}</p>
    </div>
  )
}

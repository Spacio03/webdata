'use client'

import { motion } from 'framer-motion'
import {
  Bot, BrainCircuit, CheckCircle2, DatabaseZap, MailCheck,
  PlugZap, RadioTower, ShieldCheck, Sparkles, Workflow,
  type LucideIcon,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ApprovalWorkflow } from '@/components/signalforge/ApprovalWorkflow'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { aiActions } from '@/lib/mock-data'

const realIntegrations: Array<{ name: string; detail: string; icon: LucideIcon }> = [
  { name: 'SendGrid', detail: 'Actually sends email with SENDGRID_API_KEY', icon: MailCheck },
  { name: 'Salesforce/HubSpot', detail: 'Writes scores, tasks, owners, evidence', icon: DatabaseZap },
  { name: 'Slack', detail: 'Alerts AE and logs acknowledgement', icon: RadioTower },
  { name: 'Bright Data', detail: 'Refreshes enrichment and source proof', icon: Bot },
]

export default function ActionsPage() {
  const pending = aiActions.filter(action => action.status === 'pending').length
  const emailActions = aiActions.filter(action => action.type === 'email_draft' || action.type === 'sequence_start').length
  const avgConfidence = Math.round(aiActions.reduce((sum, action) => sum + action.confidence, 0) / aiActions.length * 100)

  return (
    <AppShell>
      <div className="p-6 sm:p-8 max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <section className="rounded-xl border border-[#201515]/15 bg-[#fffefb] shadow-card overflow-hidden">
            <div className="grid xl:grid-cols-[1.1fr_0.9fr]">
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="live">Agentic execution</Badge>
                  <Badge variant="muted">Email · CRM · Slack · Sequence · Enrichment</Badge>
                </div>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-normal text-[#201515] flex items-center gap-3">
                  <Sparkles size={28} className="text-[#ff4f00]" />
                  AI Action Center
                </h1>
                <p className="mt-3 max-w-2xl text-[#605d52] leading-relaxed">
                  This is the monetizable moat: every action is grounded in live web evidence,
                  CRM memory, committee context, and buyer-specific personalization before it performs.
                </p>
                <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Metric icon={Workflow} label="Pending workflows" value={pending} />
                  <Metric icon={MailCheck} label="Outbound-ready" value={emailActions} />
                  <Metric icon={BrainCircuit} label="Avg confidence" value={`${avgConfidence}%`} />
                  <Metric icon={ShieldCheck} label="Guardrails" value="Live" />
                </div>
              </div>
              <div className="bg-[#201515] text-[#fffefb] p-6 sm:p-8">
                <p className="text-xs uppercase tracking-wider text-[#c5c0b1]">Execution graph</p>
                <div className="mt-5 space-y-3">
                  {[
                    ['Evidence moat', 'Bright Data snippets, CRM gap, competitor trigger, buyer hook.'],
                    ['Safety gate', 'Confidence, recipient, claim check, human approval.'],
                    ['Perform action', 'SendGrid email, CRM task, Slack alert, sequence, enrichment.'],
                    ['Learning loop', 'Reply, bounce, booked meeting, and no-response feed memory.'],
                  ].map(([title, detail], index) => (
                    <div key={title} className="flex gap-3">
                      <span className="h-8 w-8 rounded-lg border border-[#fffefb]/10 bg-[#fffefb]/10 flex items-center justify-center text-xs tabular-nums">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="text-xs text-[#c5c0b1] leading-relaxed">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid xl:grid-cols-[1.25fr_0.75fr] gap-6">
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-[#201515]">Executable Agent Queue</h2>
                <p className="text-sm text-[#605d52]">Approve once; the agent performs the cross-platform workflow and logs the result.</p>
              </div>
              <ApprovalWorkflow actions={aiActions} />
            </div>

            <aside className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlugZap size={16} />
                    Real Integrations
                  </CardTitle>
                  <CardDescription>Live when keys/connectors are configured, demo-safe otherwise</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pt-2">
                  {realIntegrations.map(({ name, detail, icon: Icon }) => (
                    <div key={name} className="rounded-xl border border-[#201515]/10 bg-[#f8f4f0] p-3">
                      <div className="flex items-start gap-3">
                        <span className="h-9 w-9 rounded-lg bg-[#201515] text-[#fffefb] flex items-center justify-center">
                          <Icon size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#201515]">{name}</p>
                          <p className="text-xs text-[#605d52] mt-1">{detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Why People Pay</CardTitle>
                  <CardDescription>Not just automation; defensible personalization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {[
                    'Live public-web evidence competitors do not have yet.',
                    'Account memory from CRM, email history, owner wins, and last touch.',
                    'Committee-specific hooks instead of generic AI email copy.',
                    'Human-safe execution with audit logs and outcome learning.',
                  ].map(item => (
                    <p key={item} className="flex gap-2 text-sm text-[#201515]">
                      <CheckCircle2 size={16} className="text-[#ff4f00] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </p>
                  ))}
                </CardContent>
              </Card>
            </aside>
          </section>
        </motion.div>
      </div>
    </AppShell>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-[#201515]/10 bg-[#f8f4f0] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[#605d52]">{label}</p>
        <Icon size={15} className="text-[#ff4f00]" />
      </div>
      <p className="text-2xl font-semibold text-[#201515] mt-2 tabular-nums">{value}</p>
    </div>
  )
}

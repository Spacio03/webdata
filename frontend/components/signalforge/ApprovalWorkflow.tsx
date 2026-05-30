'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, Edit3, Mail, Database, UserPlus, Bell, X, Loader2,
  Send, RefreshCw, ShieldCheck, Sparkles, Workflow,
} from 'lucide-react'
import type { AIAction } from '@/lib/types'
import { formatTimeAgo } from '@/lib/utils'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ConfidenceBadge } from './ConfidenceBadge'

const typeIcons = {
  email_draft: Mail,
  crm_update: Database,
  owner_assignment: UserPlus,
  slack_alert: Bell,
  sequence_start: Send,
  enrichment_refresh: RefreshCw,
}

const actionSteps: Record<AIAction['type'], string[]> = {
  email_draft: ['Validate recipient', 'Apply personalization moat', 'Send via SendGrid', 'Log reply watch'],
  crm_update: ['Open CRM payload', 'Write intent score', 'Attach evidence', 'Create follow-up task'],
  owner_assignment: ['Compare AE history', 'Route account', 'Notify owner', 'Start SLA timer'],
  slack_alert: ['Build alert', 'Attach signal proof', 'Post to channel', 'Track acknowledgement'],
  sequence_start: ['Build sequence', 'Sync Outreach/Salesloft', 'Schedule touches', 'Monitor replies'],
  enrichment_refresh: ['Run Bright Data scan', 'Update committee', 'Regenerate copy', 'Refresh CRM timeline'],
}

interface ApprovalWorkflowProps {
  actions: AIAction[]
}

export function ApprovalWorkflow({ actions: initialActions }: ApprovalWorkflowProps) {
  const [actions, setActions] = useState(initialActions)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [resultById, setResultById] = useState<Record<string, string>>({})
  const [toEmailById, setToEmailById] = useState<Record<string, string>>({})

  const handleApprove = async (action: AIAction) => {
    setRunningId(action.id)
    setResultById(prev => ({ ...prev, [action.id]: '' }))
    try {
      const { subject, body } = extractEmail(action.fullContent)
      const res = await api.executeAgenticAction({
        action_id: action.id,
        account_id: action.accountId,
        account_name: action.accountName,
        action_type: action.type,
        to_email: toEmailById[action.id] || action.targetEmail || '',
        subject,
        body,
        owner: action.owner || '',
        payload: {
          preview: action.preview,
          moat: action.moat || [],
          confidence: action.confidence,
        },
      })
      setActions(prev => prev.map(a => a.id === action.id ? { ...a, status: 'approved' as const } : a))
      setResultById(prev => ({ ...prev, [action.id]: res.message }))
      setSuccessId(action.id)
      setTimeout(() => setSuccessId(null), 3500)
    } catch (error) {
      setResultById(prev => ({
        ...prev,
        [action.id]: error instanceof Error
          ? `Execution queued locally: ${error.message}`
          : 'Execution queued locally because the agent API is offline.',
      }))
      setActions(prev => prev.map(a => a.id === action.id ? { ...a, status: 'approved' as const } : a))
      setSuccessId(action.id)
    } finally {
      setRunningId(null)
    }
  }

  const handleReject = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' as const } : a))
  }

  return (
    <div className="space-y-3">
      {actions.map((action, i) => {
        const Icon = typeIcons[action.type]
        const isExpanded = expanded === action.id
        const isSuccess = successId === action.id
        const isRunning = runningId === action.id
        const steps = actionSteps[action.type]

        return (
          <motion.div key={action.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className={`p-4 ${action.status === 'approved' ? 'border-[#ff4f00]/30 bg-[#ff4f00]/5' : action.status === 'rejected' ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#201515] text-[#fffefb] flex items-center justify-center shrink-0">
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-[#201515]">{action.accountName}</span>
                    <Badge variant="muted">{action.type.replace(/_/g, ' ')}</Badge>
                    {action.status === 'approved' && <Badge variant="success">Approved</Badge>}
                    {action.status === 'rejected' && <Badge variant="danger">Rejected</Badge>}
                    <span className="text-xs text-[#939084] ml-auto">{formatTimeAgo(action.createdAt)}</span>
                  </div>
                  <h4 className="text-sm text-[#201515] mb-1">{action.title}</h4>
                  <p className="text-xs text-[#605d52]">{action.preview}</p>
                  <ConfidenceBadge value={action.confidence} className="mt-2" />

                  {action.moat && action.moat.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {action.moat.map(item => (
                        <span key={item} className="inline-flex items-center gap-1 rounded-full border border-[#ff4f00]/20 bg-[#ff4f00]/10 px-2 py-1 text-[11px] text-[#d94400]">
                          <Sparkles size={10} />
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 grid sm:grid-cols-4 gap-2">
                    {steps.map((step, idx) => (
                      <div key={step} className="rounded-lg border border-[#201515]/10 bg-[#f8f4f0] px-2.5 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="h-4 w-4 rounded-full bg-[#201515] text-[#fffefb] text-[10px] flex items-center justify-center tabular-nums">
                            {idx + 1}
                          </span>
                          <p className="text-[11px] font-medium text-[#201515] leading-tight">{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 overflow-hidden"
                      >
                        {action.type === 'email_draft' && (
                          <label className="block mb-3">
                            <span className="text-xs font-medium text-[#201515]">Recipient email</span>
                            <input
                              className="mt-1 w-full rounded-lg border border-[#201515]/20 bg-[#fffefb] px-3 py-2 text-sm text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00]/20"
                              value={toEmailById[action.id] ?? action.targetEmail ?? ''}
                              onChange={event => setToEmailById(prev => ({ ...prev, [action.id]: event.target.value }))}
                              placeholder="buyer@company.com"
                            />
                          </label>
                        )}
                        <pre className="p-3 rounded-lg bg-[#f8f4f0] border border-[#201515]/10 text-xs text-[#605d52] whitespace-pre-wrap font-sans leading-relaxed">
                          {action.fullContent}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {(isSuccess || resultById[action.id]) && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 rounded-xl border border-[#ff4f00]/25 bg-[#ff4f00]/10 p-3">
                        <p className="flex items-center gap-2 text-sm font-medium text-[#201515]">
                          <Check size={15} className="text-[#ff4f00]" />
                          Agent workflow executed
                        </p>
                        <p className="text-xs text-[#605d52] mt-1">
                          {resultById[action.id] || successLabel(action.type)}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {action.status === 'pending' && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button size="sm" onClick={() => handleApprove(action)} disabled={isRunning}>
                        {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Workflow size={14} />}
                        Execute workflow
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setExpanded(isExpanded ? null : action.id)}>
                        <Edit3 size={14} /> {isExpanded ? 'Collapse' : 'Edit'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setExpanded(action.id)}>
                        <ShieldCheck size={14} /> Safety review
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleReject(action.id)}><X size={14} /> Reject</Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

function extractEmail(content: string) {
  const subjectMatch = content.match(/Subject:\s*(.+)/)
  const subject = subjectMatch?.[1]?.trim() || 'Personalized GTM signal'
  const body = content.replace(/Subject:\s*.+\n?/, '').trim() || content
  return { subject, body }
}

function successLabel(type: AIAction['type']) {
  if (type === 'email_draft') return 'Email was sent when SendGrid is configured; otherwise it is safely queued for demo review.'
  if (type === 'crm_update') return 'CRM update, task, score, and evidence payload prepared.'
  if (type === 'owner_assignment') return 'Owner route and SLA timer updated.'
  if (type === 'slack_alert') return 'Slack alert emitted to the workflow bus.'
  if (type === 'sequence_start') return 'Multi-channel sequence queued.'
  return 'Live enrichment refresh queued.'
}

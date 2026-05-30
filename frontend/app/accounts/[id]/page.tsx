'use client'

import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Users } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { IntentScore } from '@/components/signalforge/IntentScore'
import { SignalCard } from '@/components/signalforge/SignalCard'
import { AIRecommendationPanel } from '@/components/signalforge/AIRecommendationPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAccount } from '@/lib/mock-data'

export default function AccountPage() {
  const params = useParams()
  const id = params.id as string
  const account = getAccount(id)
  if (!account) notFound()

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        <Link href="/accounts" className="inline-flex items-center gap-1.5 text-xs text-[#605d52] hover:text-[#201515] mb-6">
          <ArrowLeft size={14} /> Back to all accounts
        </Link>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start gap-5 mb-8 flex-wrap">
            <div className="h-14 w-14 rounded-xl bg-[#201515] border border-[#201515] flex items-center justify-center text-xl font-semibold text-[#fffefb]">
              {account.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="page-title">{account.name}</h1>
                <Badge variant={account.status === 'hot' ? 'hot' : 'warning'}>{account.status}</Badge>
              </div>
              <p className="text-sm text-[#605d52] mt-1">{account.domain} · {account.industry} · {account.employees}</p>
              <p className="text-xs text-[#939084] mt-0.5">Owner: {account.owner} · Last touch: {account.lastTouch}</p>
            </div>
            <IntentScore score={account.intentScore} previousScore={account.previousScore} size="lg" />
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <AIRecommendationPanel
                reasoning={account.aiReasoning}
                outreachAngle={account.outreachAngle}
                recommendedAction={account.recommendedAction}
              />
              <div>
                <h2 className="text-base font-semibold text-[#201515] mb-3">
                  Web Signals <span className="text-sm font-normal text-[#939084]">via Bright Data</span>
                </h2>
                <div className="space-y-2">
                  {account.signals.map((signal, i) => (
                    <SignalCard key={signal.id} signal={signal} index={i} />
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users size={15} className="text-[#ff4f00]" />
                    Decision Makers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-2">
                  {account.decisionMakers.map(dm => (
                    <div key={dm.id} className="p-3 rounded-xl border border-[#201515]/10 bg-[#f8f4f0]">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[#201515]">{dm.name}</p>
                        <Badge variant="muted">{dm.role}</Badge>
                      </div>
                      <p className="text-xs text-[#605d52] mt-0.5">{dm.title}</p>
                      <p className="text-xs text-[#605d52] mt-2 italic">&ldquo;{dm.hook}&rdquo;</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Next Action</CardTitle></CardHeader>
                <CardContent className="pt-2 space-y-3">
                  <p className="text-sm text-[#605d52]">{account.recommendedAction}</p>
                  <Link href="/actions"><Button className="w-full">Approve Action</Button></Link>
                  <Link href="/platform"><Button variant="secondary" className="w-full">Open Pipeline</Button></Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  )
}

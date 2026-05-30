'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, AlertTriangle, Flame } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RevenueImpactCard } from '@/components/signalforge/RevenueImpactCard'
import { AccountCard } from '@/components/signalforge/AccountCard'
import { SignalCard } from '@/components/signalforge/SignalCard'
import { CompetitorAlertCard } from '@/components/signalforge/CompetitorAlert'
import { IntegrationStatusCard } from '@/components/signalforge/IntegrationStatusCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  accounts, competitorAlerts, dashboardStats, pipelineRisks, signalVolumeData,
} from '@/lib/mock-data'

const SignalVolumeChart = dynamic(
  () => import('@/components/signalforge/SignalVolumeChart').then(m => m.SignalVolumeChart),
  { ssr: false, loading: () => <div className="h-52 rounded-lg bg-neutral-50 animate-pulse" /> }
)

export default function DashboardPage() {
  const warmAccounts = accounts.filter(a => a.status === 'hot' || a.status === 'warming')
  const recentSignals = accounts.flatMap(a => a.signals).slice(0, 4)

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Badge variant="live" className="mb-3">Live · Bright Data connected</Badge>
              <h1 className="page-title text-3xl">Live web intelligence for revenue teams.</h1>
              <p className="page-subtitle max-w-xl">
                Dormant accounts are not dead. They are waiting for the right signal.
                <span className="block mt-1 text-neutral-400">
                  {dashboardStats.dormantToWarm} dormant accounts turned warm today.
                </span>
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href="/platform">
                <Button size="lg">MOSAIC Pipeline <ArrowRight size={16} /></Button>
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <RevenueImpactCard label="Warm Accounts Today" value={dashboardStats.dormantToWarm} sublabel="Dormant → active" trend="+4 vs yesterday" index={0} />
          <RevenueImpactCard label="Signals Detected" value={dashboardStats.signalsToday} sublabel="Last 24 hours" trend="+18% this week" index={1} />
          <RevenueImpactCard label="Actions Pending" value={dashboardStats.actionsPending} sublabel="Awaiting approval" index={2} />
          <RevenueImpactCard label="Avg Intent Lift" value={`+${dashboardStats.avgIntentLift}`} sublabel="Points per account" trend="68% meeting rate" index={3} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Signal Volume</CardTitle>
                <p className="text-xs text-neutral-500">Live web signals via Bright Data · 7-day view</p>
              </CardHeader>
              <CardContent>
                <SignalVolumeChart data={signalVolumeData} />
              </CardContent>
            </Card>

            <div>
              <h2 className="text-base font-semibold text-neutral-900 mb-3">Revenue Signal Feed</h2>
              <div className="space-y-2">
                {recentSignals.map((signal, i) => (
                  <SignalCard key={signal.id} signal={signal} index={i} />
                ))}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-500" />
                  Pipeline Risk Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-2">
                {pipelineRisks.map(risk => (
                  <div key={risk.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-neutral-50">
                    <div>
                      <p className="text-sm text-neutral-800">{risk.accountName}</p>
                      <p className="text-xs text-neutral-500">{risk.risk}</p>
                    </div>
                    <span className="text-sm font-medium text-red-500 tabular-nums">{risk.score}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <IntegrationStatusCard />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                  <Flame size={16} className="text-orange-500" />
                  Warm Accounts
                </h2>
                <Link href="/accounts" className="text-xs text-neutral-500 hover:text-neutral-900">View all →</Link>
              </div>
              <div className="space-y-2">
                {warmAccounts.map((account, i) => (
                  <AccountCard key={account.id} account={account} index={i} />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-neutral-900">Competitor Moves</h2>
                <Link href="/competitors" className="text-xs text-neutral-500 hover:text-neutral-900">Monitor →</Link>
              </div>
              <div className="space-y-2">
                {competitorAlerts.slice(0, 2).map((alert, i) => (
                  <CompetitorAlertCard key={alert.id} alert={alert} index={i} />
                ))}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Priority Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-2">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-sm font-medium text-neutral-900">Approve Notion outreach</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Intent 41 → 94 · 4 signals</p>
                </div>
                <Link href="/actions">
                  <Button variant="secondary" className="w-full mt-2" size="sm">
                    Open AI Action Center <ArrowRight size={14} />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

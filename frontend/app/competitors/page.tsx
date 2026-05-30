'use client'

import { motion } from 'framer-motion'
import { Swords } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { CompetitorAlertCard } from '@/components/signalforge/CompetitorAlert'
import { IntegrationStatusCard } from '@/components/signalforge/IntegrationStatusCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { competitorAlerts } from '@/lib/mock-data'

const categories = [
  { key: 'pricing', label: 'Pricing', count: competitorAlerts.filter(a => a.type === 'pricing').length },
  { key: 'landing_page', label: 'Landing Pages', count: competitorAlerts.filter(a => a.type === 'landing_page').length },
  { key: 'hiring', label: 'Hiring', count: competitorAlerts.filter(a => a.type === 'hiring').length },
  { key: 'product', label: 'Product', count: competitorAlerts.filter(a => a.type === 'product').length },
  { key: 'messaging', label: 'Messaging', count: competitorAlerts.filter(a => a.type === 'messaging').length },
]

export default function CompetitorsPage() {
  return (
    <AppShell>
      <div className="p-8 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Badge variant="live" className="mb-3">Bright Data · Live</Badge>
          <h1 className="page-title flex items-center gap-2">
            <Swords size={22} className="text-neutral-600" />
            Competitor Monitor
          </h1>
          <p className="page-subtitle max-w-lg">
            Know who is warming up before your competitors do.
          </p>

          <div className="grid grid-cols-5 gap-3 my-8">
            {categories.map(cat => (
              <Card key={cat.key} className="p-4 text-center">
                <p className="text-xl font-semibold text-neutral-900 tabular-nums">{cat.count}</p>
                <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wide">{cat.label}</p>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-2">
              {competitorAlerts.map((alert, i) => (
                <CompetitorAlertCard key={alert.id} alert={alert} index={i} />
              ))}
            </div>
            <div>
              <IntegrationStatusCard />
              <Card className="mt-4">
                <CardHeader><CardTitle>Monitoring Scope</CardTitle></CardHeader>
                <CardContent className="text-xs text-neutral-500 space-y-1.5 pt-2">
                  <p>Clay, Apollo.io, ZoomInfo, 6sense, Common Room</p>
                  <p>Pricing pages · every 6 hours</p>
                  <p>Career pages · daily</p>
                  <p>SERP API · product launches</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  )
}

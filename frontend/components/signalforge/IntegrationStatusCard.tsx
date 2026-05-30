'use client'

import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import { brightDataIntegrations } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function IntegrationStatusCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center">
              <Activity size={12} className="text-white" />
            </div>
            Powered by Bright Data
          </CardTitle>
          <Badge variant="live">Live</Badge>
        </div>
        <p className="text-xs text-neutral-500">Live web intelligence — not static CRM data</p>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-2">
        {brightDataIntegrations.map((integration, i) => (
          <motion.div
            key={integration.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-50 border border-neutral-100"
          >
            <span className="text-xs text-neutral-700">{integration.name}</span>
            <div className="flex items-center gap-3 text-[10px] text-neutral-400">
              <span className="tabular-nums">{integration.signals.toLocaleString()} signals</span>
              <span className="text-emerald-600">{integration.latency}</span>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  )
}

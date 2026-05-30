'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, DollarSign, Megaphone, Package, Users, FileText } from 'lucide-react'
import type { CompetitorAlert } from '@/lib/types'
import { formatTimeAgo } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

const typeIcons = {
  pricing: DollarSign,
  landing_page: FileText,
  hiring: Users,
  product: Package,
  messaging: Megaphone,
}

const severityVariant = {
  low: 'muted' as const,
  medium: 'warning' as const,
  high: 'danger' as const,
}

interface CompetitorAlertCardProps {
  alert: CompetitorAlert
  index?: number
}

export function CompetitorAlertCard({ alert, index = 0 }: CompetitorAlertCardProps) {
  const Icon = typeIcons[alert.type] ?? AlertTriangle

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Card className="p-4">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <Icon size={15} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-medium text-neutral-900">{alert.competitor}</span>
              <Badge variant={severityVariant[alert.severity]}>{alert.severity}</Badge>
              <span className="text-xs text-neutral-400 ml-auto">{formatTimeAgo(alert.detectedAt)}</span>
            </div>
            <h4 className="text-sm text-neutral-700 mb-1">{alert.title}</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">{alert.summary}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

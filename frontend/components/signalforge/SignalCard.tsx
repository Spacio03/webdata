'use client'

import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import type { WebSignal } from '@/lib/types'
import { formatTimeAgo } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ConfidenceBadge, SignalStrength } from './ConfidenceBadge'

const typeLabels: Record<string, string> = {
  hiring_spike: 'Hiring Spike',
  funding: 'News Activity',
  product_launch: 'Product Launch',
  pricing_change: 'Pricing Change',
  leadership_change: 'Leadership',
  competitor_mention: 'Competitor Signal',
  website_change: 'Website Change',
  review_activity: 'Review Activity',
}

interface SignalCardProps {
  signal: WebSignal
  index?: number
}

export function SignalCard({ signal, index = 0 }: SignalCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      <Card className="p-4 hover:border-neutral-300 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default">{typeLabels[signal.type] ?? signal.type}</Badge>
            <Badge variant="muted">{signal.source.replace('Bright Data ', '')}</Badge>
          </div>
          <span className="text-xs text-neutral-400 shrink-0">{formatTimeAgo(signal.detectedAt)}</span>
        </div>
        <h4 className="text-sm font-medium text-neutral-900 mb-1">{signal.title}</h4>
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">{signal.evidence}</p>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <ConfidenceBadge value={signal.confidence} />
            <SignalStrength strength={signal.strength} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-emerald-600">{signal.impact}</span>
            <a href={signal.sourceUrl} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-neutral-700">
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

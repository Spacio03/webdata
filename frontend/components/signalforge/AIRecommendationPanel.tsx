'use client'

import { Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfidenceBadge } from './ConfidenceBadge'

interface AIRecommendationPanelProps {
  reasoning: string
  outreachAngle: string
  recommendedAction: string
  confidence?: number
}

export function AIRecommendationPanel({
  reasoning,
  outreachAngle,
  recommendedAction,
  confidence = 0.91,
}: AIRecommendationPanelProps) {
  return (
    <Card className="border-blue-100 bg-blue-50/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Sparkles size={15} className="text-blue-600" />
            AI Signal Analysis
          </CardTitle>
          <ConfidenceBadge value={confidence} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium mb-1">Why this account is warm now</p>
          <p className="text-sm text-neutral-700 leading-relaxed">{reasoning}</p>
        </div>
        <div className="rounded-lg bg-white border border-neutral-200 p-3">
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium mb-1">Recommended outreach angle</p>
          <p className="text-sm text-neutral-700 leading-relaxed italic">&ldquo;{outreachAngle}&rdquo;</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-medium mb-1">Next GTM action</p>
          <p className="text-sm text-neutral-800">{recommendedAction}</p>
        </div>
      </CardContent>
    </Card>
  )
}

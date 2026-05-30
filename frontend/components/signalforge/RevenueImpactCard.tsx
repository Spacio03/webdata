'use client'

import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface RevenueImpactCardProps {
  label: string
  value: string | number
  sublabel?: string
  trend?: string
  index?: number
}

export function RevenueImpactCard({ label, value, sublabel, trend, index = 0 }: RevenueImpactCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className="p-5">
        <CardContent className="p-0">
          <p className="text-xs text-neutral-500 font-medium">{label}</p>
          <p className="text-2xl font-semibold text-neutral-900 tabular-nums mt-1">{value}</p>
          {sublabel && <p className="text-xs text-neutral-400 mt-0.5">{sublabel}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
              <TrendingUp size={12} />
              {trend}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

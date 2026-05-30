'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, Flame } from 'lucide-react'
import type { Account } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { IntentScore } from './IntentScore'

const statusConfig = {
  dormant: { label: 'Dormant', variant: 'muted' as const },
  warming: { label: 'Warming', variant: 'warning' as const },
  hot: { label: 'Hot', variant: 'hot' as const },
  engaged: { label: 'Engaged', variant: 'success' as const },
}

interface AccountCardProps {
  account: Account
  index?: number
}

export function AccountCard({ account, index = 0 }: AccountCardProps) {
  const status = statusConfig[account.status]
  const delta = account.intentScore - account.previousScore

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/accounts/${account.id}`}>
        <Card className="p-4 hover:border-[#ff4f00]/35 hover:shadow-soft transition-all cursor-pointer group">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#201515] border border-[#201515] flex items-center justify-center text-sm font-semibold text-[#fffefb] shrink-0">
              {account.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-medium text-[#201515]">{account.name}</h3>
                <Badge variant={status.variant}>
                  {account.status === 'hot' && <Flame size={10} className="mr-1" />}
                  {status.label}
                </Badge>
              </div>
              <p className="text-xs text-[#605d52]">{account.domain} · {account.industry}</p>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <IntentScore score={account.intentScore} previousScore={account.previousScore} size="sm" />
              <ArrowUpRight size={14} className="text-[#939084] group-hover:text-[#ff4f00] mt-1 transition-colors" />
            </div>
          </div>
          {delta > 20 && (
            <p className="text-xs text-[#d94400] mt-3 pt-3 border-t border-[#201515]/10">
              +{delta} intent in 72h · Last touch {account.lastTouch}
            </p>
          )}
        </Card>
      </Link>
    </motion.div>
  )
}

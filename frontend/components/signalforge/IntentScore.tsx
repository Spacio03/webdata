'use client'

import { cn } from '@/lib/utils'

interface IntentScoreProps {
  score: number
  previousScore?: number
  size?: 'sm' | 'md' | 'lg'
  showDelta?: boolean
  className?: string
}

export function IntentScore({ score, previousScore, size = 'md', showDelta = true, className }: IntentScoreProps) {
  const delta = previousScore !== undefined ? score - previousScore : 0
  const strokeColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#a3a3a3'

  const sizes = {
    sm: { container: 'h-10 w-10', text: 'text-xs' },
    md: { container: 'h-14 w-14', text: 'text-sm' },
    lg: { container: 'h-20 w-20', text: 'text-lg' },
  }

  const circumference = 2 * Math.PI * 15.5
  const offset = circumference - (score / 100) * circumference

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('relative flex items-center justify-center', sizes[size].container)}>
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f5f5f5" strokeWidth="2.5" />
          <circle
            cx="18" cy="18" r="15.5" fill="none"
            stroke={strokeColor} strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <span className={cn('font-semibold tabular-nums text-neutral-900', sizes[size].text)}>{score}</span>
      </div>
      {showDelta && delta !== 0 && (
        <span className={cn('text-sm font-medium tabular-nums', delta > 0 ? 'text-emerald-600' : 'text-red-500')}>
          {delta > 0 ? '+' : ''}{delta}
        </span>
      )}
    </div>
  )
}

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface ConfidenceBadgeProps {
  value: number
  className?: string
}

export function ConfidenceBadge({ value, className }: ConfidenceBadgeProps) {
  const pct = Math.round(value * 100)
  const variant = pct >= 90 ? 'success' : pct >= 75 ? 'default' : 'warning'
  return (
    <Badge variant={variant} className={cn('tabular-nums', className)}>
      {pct}% confidence
    </Badge>
  )
}

interface SignalStrengthProps {
  strength: number
  className?: string
}

export function SignalStrength({ strength, className }: SignalStrengthProps) {
  const bars = 5
  const filled = Math.round((strength / 100) * bars)
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex gap-0.5">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-3 w-1 rounded-full',
              i < filled ? 'bg-blue-500' : 'bg-neutral-200'
            )}
          />
        ))}
      </div>
      <span className="text-xs text-neutral-400 tabular-nums">{strength}</span>
    </div>
  )
}

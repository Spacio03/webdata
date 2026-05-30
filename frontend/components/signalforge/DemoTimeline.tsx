'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DemoTimelineStep {
  id: number
  title: string
  description: string
  highlight?: string
}

interface DemoTimelineProps {
  steps: DemoTimelineStep[]
  activeStep: number
  onStepClick?: (step: number) => void
}

export function DemoTimeline({ steps, activeStep, onStepClick }: DemoTimelineProps) {
  return (
    <div>
      {steps.map((step, i) => {
        const isActive = step.id === activeStep
        const isComplete = step.id < activeStep

        return (
          <button key={step.id} onClick={() => onStepClick?.(step.id)} className="flex gap-3 w-full text-left mb-0">
            <div className="flex flex-col items-center">
              <div className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors',
                isComplete && 'border-emerald-500 bg-emerald-50 text-emerald-600',
                isActive && 'border-neutral-900 bg-neutral-900 text-white',
                !isComplete && !isActive && 'border-neutral-200 text-neutral-400'
              )}>
                {isComplete ? <CheckCircle2 size={14} /> : <Circle size={12} />}
              </div>
              {i < steps.length - 1 && (
                <div className={cn('w-px flex-1 min-h-[1.5rem] my-1', isComplete ? 'bg-emerald-300' : 'bg-neutral-200')} />
              )}
            </div>
            <div className={cn('pb-5 flex-1', isActive && 'pb-6')}>
              <p className={cn('text-sm', isActive ? 'font-medium text-neutral-900' : isComplete ? 'text-neutral-500' : 'text-neutral-400')}>
                {step.title}
              </p>
              {isActive && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{step.description}</p>
                  {step.highlight && <p className="text-xs text-blue-600 mt-1.5 font-medium">{step.highlight}</p>}
                </motion.div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

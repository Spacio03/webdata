import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4f00]/25 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#ff4f00] text-[#fffefb] hover:bg-[#d94400] shadow-sm',
        secondary: 'bg-[#201515] text-[#fffefb] border border-[#201515] hover:bg-[#2f2a26]',
        ghost: 'text-[#605d52] hover:text-[#201515] hover:bg-[#f8f4f0]',
        outline: 'border border-[#201515] bg-[#fffefb] text-[#201515] hover:bg-[#f8f4f0]',
        success: 'bg-emerald-700 text-white hover:bg-emerald-800',
        danger: 'bg-[#fffefb] text-red-700 border border-red-200 hover:bg-red-50',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { buttonVariants }

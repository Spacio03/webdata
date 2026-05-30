'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Swords, Sparkles,
  Radar, MapPinned,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/platform', label: 'CaliSignal SDR', icon: MapPinned },
  { href: '/accounts', label: 'Accounts', icon: Building2 },
  { href: '/competitors', label: 'Competitors', icon: Swords },
  { href: '/actions', label: 'AI Actions', icon: Sparkles, badge: '4' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-[#201515]/10 bg-[#fffefb] flex flex-col">
      <div className="p-5 border-b border-[#201515]/10">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-xl bg-[#201515] flex items-center justify-center">
            <Radar size={16} className="text-[#fffefb]" />
          </div>
          <div>
            <p className="font-semibold text-[#201515] tracking-normal text-sm">
              CaliSignal
            </p>
            <p className="text-[10px] text-[#939084]">AI SDR Copilot</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(item => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group',
                isActive
                  ? 'bg-[#f8f4f0] text-[#201515] font-medium'
                  : 'text-[#605d52] hover:text-[#201515] hover:bg-[#f8f4f0]',
              )}
            >
              {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-[#ff4f00]" />}
              <Icon size={16} className={isActive ? 'text-[#201515]' : 'text-[#939084] group-hover:text-[#605d52]'} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded-full bg-[#f8f4f0] text-[#605d52]">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#201515]/10">
        <div className="rounded-xl bg-[#f8f4f0] border border-[#201515]/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#939084] font-medium">Powered by</p>
          <p className="text-xs font-medium text-[#201515] mt-0.5">Bright Data</p>
          <p className="text-[10px] text-[#605d52] mt-1">SERP · Unlocker · Scraper</p>
        </div>
      </div>
    </aside>
  )
}

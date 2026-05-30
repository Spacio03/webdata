'use client'

import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffefb]">
      <Sidebar />
      <main className="pl-60 min-h-screen">
        {children}
      </main>
    </div>
  )
}

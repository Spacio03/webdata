'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface SignalVolumeChartProps {
  data: { day: string; signals: number; warm: number }[]
}

export function SignalVolumeChart({ data }: SignalVolumeChartProps) {
  return (
    <div className="h-52 w-full min-h-[208px]">
      <ResponsiveContainer width="100%" height={208}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="signalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
          <XAxis dataKey="day" stroke="#a3a3a3" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#a3a3a3" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 12 }} />
          <Area type="monotone" dataKey="signals" stroke="#3b82f6" fill="url(#signalGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="warm" stroke="#10b981" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export type ICPConfig = {
  industries: string[]
  employee_range: [number, number]
  us_states: string[]
  funding_stages: string[]
  tech_stack_signals: string[]
  negative_signals: string[]
  your_product: string
  sender_name: string
  sender_company: string
}

export type IntentSignal = {
  signal_type: string
  source: string
  evidence: string
  source_url: string
  confidence: number
  detected_at?: string
  ai_interpretation: string
  score_impact: number
}

export type Stakeholder = {
  name: string
  title: string
  linkedin_url?: string
  role_in_deal: string
  priority: number
  hook: string
}

export type BuyingWindow = {
  triggered_pattern: string
  pattern_label: string
  days_to_window: number
  confidence: number
  evidence: string
}

export type OutreachDraft = {
  stakeholder_name: string
  stakeholder_title: string
  subject_lines: string[]
  body: string
  cta: string
}

export type Opportunity = {
  id: string
  company_name: string
  domain: string
  score: number
  status: string
  signals: IntentSignal[]
  committee: Stakeholder[]
  buying_window: BuyingWindow | null
  account_brief: string
  drafts: OutreachDraft[]
  why_now_bullets: string[]
  icp_score: number
  icp_meta: Record<string, string>
  created_at: string
}

export type ScoreSnapshot = {
  id: string
  opportunity_id: string
  company_name: string
  score: number
  trigger_label: string
  signals_count: number
  snapshot_at: string
}

export type AlertLog = {
  id: string
  opportunity_id: string
  company_name: string
  score: number
  channel: string
  owner: string
  status: string
  message: string
  fired_at: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  return res.json() as Promise<T>
}

export const api = {
  health: () => request<{ demo_mode: boolean }>('/api/health'),
  getIcp: () => request<ICPConfig>('/api/icp'),
  saveIcp: (icp: ICPConfig) =>
    request<{ status: string }>('/api/icp', { method: 'POST', body: JSON.stringify(icp) }),
  runPipelineSync: (body: Record<string, unknown>) =>
    request<{ status: string; count: number; warning?: string }>('/api/pipeline/run-sync', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listOpportunities: (status = '') =>
    request<Opportunity[]>(`/api/opportunities${status ? `?status=${status}` : ''}`),
  getTimeline: (id: string) => request<ScoreSnapshot[]>(`/api/opportunities/${id}/timeline`),
  action: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/opportunities/${id}/action`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listAlerts: () => request<AlertLog[]>('/api/alerts'),
  ask: (question: string) =>
    request<{ answer: string }>('/api/intelligence/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
  executeAgenticAction: (body: Record<string, unknown>) =>
    request<{
      status: string
      performed: boolean
      provider: string
      message: string
      account_name: string
      action_type: string
    }>('/api/agentic/execute', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

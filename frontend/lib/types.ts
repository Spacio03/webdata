export type SignalType =
  | 'hiring_spike'
  | 'funding'
  | 'product_launch'
  | 'pricing_change'
  | 'leadership_change'
  | 'competitor_mention'
  | 'website_change'
  | 'review_activity'

export type SignalSource = 'Bright Data Web Scraper' | 'Bright Data SERP API' | 'Bright Data Web Unlocker' | 'Bright Data MCP'

export interface WebSignal {
  id: string
  type: SignalType
  title: string
  evidence: string
  source: SignalSource
  sourceUrl: string
  confidence: number
  strength: number
  detectedAt: string
  impact: string
}

export interface DecisionMaker {
  id: string
  name: string
  title: string
  role: string
  linkedin?: string
  hook: string
}

export interface Account {
  id: string
  name: string
  domain: string
  industry: string
  employees: string
  intentScore: number
  previousScore: number
  status: 'dormant' | 'warming' | 'hot' | 'engaged'
  owner: string
  lastTouch: string
  signals: WebSignal[]
  decisionMakers: DecisionMaker[]
  outreachAngle: string
  aiReasoning: string
  recommendedAction: string
  logo?: string
}

export interface CompetitorAlert {
  id: string
  competitor: string
  type: 'pricing' | 'landing_page' | 'hiring' | 'product' | 'messaging'
  title: string
  summary: string
  detectedAt: string
  severity: 'low' | 'medium' | 'high'
  source: SignalSource
}

export interface AIAction {
  id: string
  accountId: string
  accountName: string
  type: 'email_draft' | 'crm_update' | 'owner_assignment' | 'slack_alert' | 'sequence_start' | 'enrichment_refresh'
  title: string
  preview: string
  fullContent: string
  confidence: number
  status: 'pending' | 'approved' | 'rejected' | 'edited'
  createdAt: string
  moat?: string[]
  targetEmail?: string
  owner?: string
}

export interface PipelineRisk {
  id: string
  accountName: string
  risk: string
  score: number
  trend: 'up' | 'down' | 'flat'
}

export interface DemoStep {
  id: number
  title: string
  description: string
  highlight?: string
}

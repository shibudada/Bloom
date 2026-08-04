export type ThemeMode = 'dark' | 'light'

export type ConsultStatus = 'New' | 'In review' | 'Draft ready' | 'Signed' | 'Completed'

export type Workstream = 'consult' | 'support'

export type Priority = 'Routine' | 'Watch' | 'Urgent'

export interface Patient {
  name: string
  initials: string
  age: number
  pronouns: string
  stage: string
  location: string
  lastVisit: string
}

export interface Medication {
  name: string
  status: string
  medicationStatus?: string
  templateId?: string
  writtenDate?: string
  effectiveDate?: string
  dosageInstructions?: string
  start?: string
  end?: string
}

export interface LabResult {
  name: string
  value: string
  range: string
  collected: string
  status: 'Normal' | 'High' | 'Low' | 'Flagged'
}

export interface Condition {
  name: string
  status: string
  onset: string
}

export interface Vital {
  name: string
  value: string
  date: string
}

export interface AgentEvent {
  id: string
  label: string
  body: string[]
  kind?: 'thinking' | 'tool' | 'update' | 'draft' | 'signed' | 'action' | 'error'
}

export interface DraftOrder {
  medication: string
  sig: string
  allergies: string
  quantity: string
  refills: string
  daysSupply: string
  pharmacy: string
  notes: string
  substitutions: string
}

export interface ChatMessage {
  id: string
  sender: 'patient' | 'agent' | 'clinician'
  name: string
  time: string
  body: string[]
}

export type AgentActionType = 'draft_plan' | 'draft_prescription'

export type AgentActionStatus = 'drafted' | 'accepted' | 'rejected'

export interface DraftPlanAction {
  id: string
  type: 'draft_plan'
  title: string
  status: AgentActionStatus
  generatedAt: string
  rationale: string
  sections: Array<{
    heading: string
    items: string[]
  }>
  safetyChecks: string[]
}

export interface DraftPrescriptionAction {
  id: string
  type: 'draft_prescription'
  title: string
  status: AgentActionStatus
  generatedAt: string
  rationale: string
  order: DraftOrder
  safetyChecks: string[]
}

export type AgentActionCard = DraftPlanAction | DraftPrescriptionAction

export interface AgentActionResponse {
  event: AgentEvent
  actionCard: AgentActionCard
}

export interface TimelineEvent {
  id: string
  time: string
  type: 'intake' | 'chat' | 'lab' | 'medication' | 'clinician' | 'safety'
  title: string
  detail: string
}

export interface Consult {
  id: string
  patient: Patient
  requestTitle: string
  requestType: string
  workstream: Workstream
  receivedAt: string
  waiting: string
  status: ConsultStatus
  priority: Priority
  aiReadiness: number
  tags: string[]
  safetyFlags: string[]
  summary: string
  activeProblem: string
  note: string
  prescribedMedications: Medication[]
  ehrMedications: Medication[]
  labs: LabResult[]
  conditions: Condition[]
  vitals: Vital[]
  agentEvents: AgentEvent[]
  draftOrder: DraftOrder
  actionCards: AgentActionCard[]
  chat: ChatMessage[]
  timeline: TimelineEvent[]
  followUps: string[]
  internalNotes: string
}

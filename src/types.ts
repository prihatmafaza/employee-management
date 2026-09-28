export type Role = 'USER' | 'MANAGER' | 'ADMIN'
export type RequestStatus = 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'
export type ApprovalStep = 'MANAGER' | 'ADMIN'
export type Decision = 'APPROVED' | 'REJECTED'

export interface User {
  id: number
  username: string
  fullName: string
  role: Role
  managerId: number | null
}

export interface AccessType {
  id: number
  name: string
  description: string
}

export interface Approval {
  step: ApprovalStep
  decision: Decision
  approver: { id: number; fullName: string }
  comment: string | null
  decidedAt: string
}

export interface AccessRequest {
  id: number
  accessType: AccessType
  requester: { id: number; fullName: string }
  reason: string
  status: RequestStatus
  /** The approval the request is waiting on; null once it is final. */
  currentStep: ApprovalStep | null
  approvals: Approval[]
  createdAt: string
  updatedAt: string
}

/**
 * Which requests a dashboard summary counts: the whole system (ADMIN), the
 * caller's team (MANAGER) or the caller's own requests (USER).
 */
export type SummaryScope = 'SYSTEM' | 'TEAM' | 'MINE'

/**
 * Request counts for the dashboard. Always true:
 * total = inProgress + approved + rejected, and
 * inProgress = waitingManager + waitingAdmin.
 */
export interface DashboardSummary {
  scope: SummaryScope
  total: number
  inProgress: number
  waitingManager: number
  waitingAdmin: number
  approved: number
  rejected: number
  /** When the counts were computed (ISO 8601). */
  generatedAt: string
}

/** A request as seen by a reviewer, with whether they can act on it right now. */
export interface ReviewItem extends AccessRequest {
  canAct: boolean
}

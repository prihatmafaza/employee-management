import type {
  AccessRequest,
  AccessType,
  DashboardSummary,
  Decision,
  ReviewItem,
  User,
} from '../types.ts'
import { httpApi } from './httpApi.ts'
import { mockApi } from './mockApi.ts'

export { ApiError } from './errors.ts'

/**
 * The contract the UI depends on (see docs/api-contract.md). Backed by the real
 * backend over HTTP, or by the in-browser mock when VITE_USE_MOCK=true.
 */
export interface Api {
  login(username: string, password: string): Promise<User>
  logout(): Promise<void>
  /** The logged-in user, or null when there is no session. */
  me(): Promise<User | null>

  listAccessTypes(): Promise<AccessType[]>
  /** Requests submitted by the logged-in USER, newest first. */
  listMyRequests(): Promise<AccessRequest[]>
  submitRequest(input: { accessTypeId: number; reason: string }): Promise<AccessRequest>

  /**
   * Requests visible to a MANAGER (their team) or an ADMIN (those a manager has
   * approved), newest first.
   */
  listReviewItems(): Promise<ReviewItem[]>
  decide(requestId: number, decision: Decision, comment: string): Promise<AccessRequest>

  /** Request counts by status, scoped to the caller's role (see SummaryScope). */
  getDashboardSummary(): Promise<DashboardSummary>
}

export const api: Api = import.meta.env.VITE_USE_MOCK === 'true' ? mockApi : httpApi

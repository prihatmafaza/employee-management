/**
 * The real backend (see docs/api-contract.md). Requests go to `/api` on the same
 * origin; in development Vite proxies them to the Spring Boot server.
 *
 * Login returns a JWT access token, which is sent as `Authorization: Bearer` on
 * every call. It is kept in sessionStorage: it survives a reload, is separate
 * per tab (so tabs can be logged in as different users) and is gone when the
 * tab closes.
 */
import type {
  AccessRequest,
  AccessType,
  DashboardSummary,
  Decision,
  ReviewItem,
  User,
} from '../types.ts'
import { ApiError } from './errors.ts'
import type { Api } from './index.ts'

const TOKEN_KEY = 'access-mgmt:token:v1'

interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: User
}

function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

function setToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Please check your connection and try again.')
  }

  if (!res.ok) {
    // The token is missing, expired or revoked: forget it so the next load starts at login.
    if (res.status === 401) setToken(null)
    throw new ApiError(res.status, await errorMessageFrom(res))
  }
  if (res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}

/** Reads `error.message` from a contract error body, falling back to a generic message. */
async function errorMessageFrom(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json()
    const message = (body as { error?: { message?: unknown } } | null)?.error?.message
    if (typeof message === 'string' && message) return message
  } catch {
    // Not JSON (e.g. a proxy error page).
  }
  return `Request failed (HTTP ${res.status}).`
}

export const httpApi: Api = {
  async login(username, password) {
    setToken(null)
    const res = await request<LoginResponse>('POST', '/auth/login', { username, password })
    setToken(res.accessToken)
    return res.user
  },

  async logout() {
    try {
      // Revokes the token on the server. Best effort: even if the server can't
      // be reached, dropping the token below still logs this tab out.
      await request<void>('POST', '/auth/logout')
    } catch {
      // Ignored on purpose.
    } finally {
      setToken(null)
    }
  },

  async me() {
    if (!getToken()) return null
    try {
      return await request<User>('GET', '/auth/me')
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null
      throw e
    }
  },

  listAccessTypes() {
    return request<AccessType[]>('GET', '/access-types')
  },

  listMyRequests() {
    return request<AccessRequest[]>('GET', '/requests/mine')
  },

  submitRequest({ accessTypeId, reason }) {
    return request<AccessRequest>('POST', '/requests', { accessTypeId, reason })
  },

  listReviewItems() {
    return request<ReviewItem[]>('GET', '/approvals')
  },

  decide(requestId: number, decision: Decision, comment: string) {
    return request<AccessRequest>('POST', `/requests/${requestId}/decision`, { decision, comment })
  },

  getDashboardSummary() {
    return request<DashboardSummary>('GET', '/dashboard/summary')
  },
}

/**
 * In-browser stand-in for the backend. State lives in localStorage so it
 * survives reloads and can be shared between tabs logged in as different users.
 * It enforces the same rules the real API will: role checks, manager scoping,
 * and the two-step MANAGER -> ADMIN approval workflow.
 */
import type {
  AccessRequest,
  AccessType,
  Approval,
  ApprovalStep,
  DashboardSummary,
  Decision,
  RequestStatus,
  ReviewItem,
  Role,
  User,
} from '../types.ts'
import { DEMO_PASSWORD } from '../demo.ts'
import { ApiError } from './errors.ts'
import type { Api } from './index.ts'

const DB_KEY = 'access-mgmt:db:v1'
const SESSION_KEY = 'access-mgmt:session:v1'
const LATENCY_MS = 250
const MAX_REASON_LENGTH = 500


interface StoredUser extends User {
  password: string
}

interface StoredApproval {
  step: ApprovalStep
  decision: Decision
  approverId: number
  comment: string | null
  decidedAt: string
}

interface StoredRequest {
  id: number
  userId: number
  accessTypeId: number
  reason: string
  status: RequestStatus
  currentStep: ApprovalStep | null
  approvals: StoredApproval[]
  createdAt: string
  updatedAt: string
}

interface Db {
  users: StoredUser[]
  accessTypes: AccessType[]
  requests: StoredRequest[]
  nextRequestId: number
}

function seedDb(): Db {
  const user = (
    id: number,
    username: string,
    fullName: string,
    role: Role,
    managerId: number | null = null,
  ): StoredUser => ({ id, username, fullName, role, managerId, password: DEMO_PASSWORD })

  return {
    users: [
      user(1, 'admin', 'Adam Admin', 'ADMIN'),
      user(2, 'maria', 'Maria Manager', 'MANAGER'),
      user(3, 'mark', 'Mark Manager', 'MANAGER'),
      user(4, 'alice', 'Alice Anderson', 'USER', 2),
      user(5, 'bob', 'Bob Brown', 'USER', 2),
      user(6, 'charlie', 'Charlie Clark', 'USER', 3),
    ],
    accessTypes: [
      { id: 1, name: 'VPN Access', description: 'Remote connection to the internal company network.' },
      { id: 2, name: 'GitHub / GitLab Access', description: 'Access to the company source code repositories.' },
      { id: 3, name: 'Figma Access', description: 'Editor seat in the company design workspace.' },
      { id: 4, name: 'Jira Access', description: 'Create and manage issues in the project tracker.' },
    ],
    requests: [],
    nextRequestId: 1,
  }
}

function loadDb(): Db {
  const raw = localStorage.getItem(DB_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as Db
    } catch {
      // Corrupt state: fall through and reseed.
    }
  }
  const db = seedDb()
  saveDb(db)
  return db
}

function saveDb(db: Db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

/** Wipes all mock data back to the seed state. */
export function resetMockData() {
  localStorage.removeItem(DB_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

// The session is per tab, so two tabs can be logged in as different users.
function sessionUserId(): number | null {
  const raw = sessionStorage.getItem(SESSION_KEY)
  return raw ? Number(raw) : null
}

function delay() {
  return new Promise((resolve) => setTimeout(resolve, LATENCY_MS))
}

function publicUser(stored: StoredUser): User {
  const { id, username, fullName, role, managerId } = stored
  return { id, username, fullName, role, managerId }
}

function requireUser(db: Db, ...roles: Role[]): StoredUser {
  const id = sessionUserId()
  const user = id === null ? undefined : db.users.find((u) => u.id === id)
  if (!user) throw new ApiError(401, 'Your session has expired. Please log in again.')
  if (roles.length > 0 && !roles.includes(user.role)) {
    throw new ApiError(403, 'You do not have permission to do that.')
  }
  return user
}

function toDto(db: Db, r: StoredRequest): AccessRequest {
  const findUser = (id: number) => {
    const u = db.users.find((x) => x.id === id)!
    return { id: u.id, fullName: u.fullName }
  }
  return {
    id: r.id,
    accessType: db.accessTypes.find((a) => a.id === r.accessTypeId)!,
    requester: findUser(r.userId),
    reason: r.reason,
    status: r.status,
    currentStep: r.currentStep,
    approvals: r.approvals.map(
      (a): Approval => ({
        step: a.step,
        decision: a.decision,
        approver: findUser(a.approverId),
        comment: a.comment,
        decidedAt: a.decidedAt,
      }),
    ),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

const newestFirst = (a: StoredRequest, b: StoredRequest) => b.id - a.id

/**
 * Managers see their direct reports' requests. Admins only see requests that a
 * manager has already approved.
 */
function isVisibleTo(db: Db, reviewer: StoredUser, r: StoredRequest): boolean {
  if (reviewer.role === 'ADMIN') {
    return r.approvals.some((a) => a.step === 'MANAGER' && a.decision === 'APPROVED')
  }
  return db.users.find((u) => u.id === r.userId)?.managerId === reviewer.id
}

function canAct(reviewer: StoredUser, r: StoredRequest): boolean {
  return (
    r.status === 'IN_PROGRESS' &&
    ((r.currentStep === 'MANAGER' && reviewer.role === 'MANAGER') ||
      (r.currentStep === 'ADMIN' && reviewer.role === 'ADMIN'))
  )
}

export const mockApi: Api = {
  async login(username, password) {
    await delay()
    const db = loadDb()
    const user = db.users.find((u) => u.username === username.trim().toLowerCase())
    if (!user || user.password !== password) {
      throw new ApiError(401, 'Invalid username or password.')
    }
    sessionStorage.setItem(SESSION_KEY, String(user.id))
    return publicUser(user)
  },

  async logout() {
    await delay()
    sessionStorage.removeItem(SESSION_KEY)
  },

  async me() {
    const id = sessionUserId()
    if (id === null) return null
    const user = loadDb().users.find((u) => u.id === id)
    return user ? publicUser(user) : null
  },

  async listAccessTypes() {
    await delay()
    const db = loadDb()
    requireUser(db)
    return db.accessTypes
  },

  async listMyRequests() {
    await delay()
    const db = loadDb()
    const user = requireUser(db, 'USER')
    return db.requests
      .filter((r) => r.userId === user.id)
      .sort(newestFirst)
      .map((r) => toDto(db, r))
  },

  async submitRequest({ accessTypeId, reason }) {
    await delay()
    const db = loadDb()
    const user = requireUser(db, 'USER')

    const trimmed = reason.trim()
    if (!trimmed) throw new ApiError(400, 'Please enter a reason for the request.')
    if (trimmed.length > MAX_REASON_LENGTH) {
      throw new ApiError(400, `Reason must be at most ${MAX_REASON_LENGTH} characters.`)
    }
    const accessType = db.accessTypes.find((a) => a.id === accessTypeId)
    if (!accessType) throw new ApiError(400, 'Please select a valid access.')
    if (user.managerId === null) {
      throw new ApiError(400, 'You have no manager assigned, so your request cannot be approved.')
    }

    const existing = db.requests.find(
      (r) => r.userId === user.id && r.accessTypeId === accessTypeId && r.status !== 'REJECTED',
    )
    if (existing) {
      throw new ApiError(
        409,
        existing.status === 'APPROVED'
          ? `You already have ${accessType.name}.`
          : `You already have a pending request for ${accessType.name}.`,
      )
    }

    const now = new Date().toISOString()
    const request: StoredRequest = {
      id: db.nextRequestId++,
      userId: user.id,
      accessTypeId,
      reason: trimmed,
      status: 'IN_PROGRESS',
      currentStep: 'MANAGER',
      approvals: [],
      createdAt: now,
      updatedAt: now,
    }
    db.requests.push(request)
    saveDb(db)
    return toDto(db, request)
  },

  async listReviewItems() {
    await delay()
    const db = loadDb()
    const reviewer = requireUser(db, 'MANAGER', 'ADMIN')
    return db.requests
      .filter((r) => isVisibleTo(db, reviewer, r))
      .sort(newestFirst)
      .map((r): ReviewItem => ({ ...toDto(db, r), canAct: canAct(reviewer, r) }))
  },

  async decide(requestId, decision, comment) {
    await delay()
    const db = loadDb()
    const reviewer = requireUser(db, 'MANAGER', 'ADMIN')

    const request = db.requests.find((r) => r.id === requestId)
    if (!request || !isVisibleTo(db, reviewer, request)) {
      throw new ApiError(404, 'Request not found.')
    }
    if (request.status !== 'IN_PROGRESS' || request.currentStep === null) {
      throw new ApiError(409, 'This request has already been finalized.')
    }
    if (!canAct(reviewer, request)) {
      throw new ApiError(
        409,
        request.currentStep === 'MANAGER'
          ? 'This request is still waiting for manager approval.'
          : 'This request is waiting for admin approval.',
      )
    }
    const trimmed = comment.trim()
    if (decision === 'REJECTED' && !trimmed) {
      throw new ApiError(400, 'Please give a reason for the rejection.')
    }

    const now = new Date().toISOString()
    request.approvals.push({
      step: request.currentStep,
      decision,
      approverId: reviewer.id,
      comment: trimmed || null,
      decidedAt: now,
    })
    if (decision === 'REJECTED') {
      request.status = 'REJECTED'
      request.currentStep = null
    } else if (request.currentStep === 'MANAGER') {
      // First approval only moves the request on; it stays IN_PROGRESS.
      request.currentStep = 'ADMIN'
    } else {
      request.status = 'APPROVED'
      request.currentStep = null
    }
    request.updatedAt = now
    saveDb(db)
    return toDto(db, request)
  },

  async getDashboardSummary() {
    await delay()
    const db = loadDb()
    const user = requireUser(db)

    // Admins get system-wide counts: aggregates only, so this is wider than the
    // requests they may open. Managers get their team, users their own.
    const scope: DashboardSummary['scope'] =
      user.role === 'ADMIN' ? 'SYSTEM' : user.role === 'MANAGER' ? 'TEAM' : 'MINE'
    const counted = db.requests.filter((r) => {
      if (scope === 'SYSTEM') return true
      if (scope === 'MINE') return r.userId === user.id
      return db.users.find((u) => u.id === r.userId)?.managerId === user.id
    })

    const count = (pred: (r: StoredRequest) => boolean) => counted.filter(pred).length
    return {
      scope,
      total: counted.length,
      inProgress: count((r) => r.status === 'IN_PROGRESS'),
      waitingManager: count((r) => r.currentStep === 'MANAGER'),
      waitingAdmin: count((r) => r.currentStep === 'ADMIN'),
      approved: count((r) => r.status === 'APPROVED'),
      rejected: count((r) => r.status === 'REJECTED'),
      generatedAt: new Date().toISOString(),
    }
  },
}

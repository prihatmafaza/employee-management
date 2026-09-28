import type { AccessRequest } from '../types.ts'

const LABELS = {
  IN_PROGRESS: 'In progress',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const

export function StatusBadge({ status }: { status: AccessRequest['status'] }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{LABELS[status]}</span>
}

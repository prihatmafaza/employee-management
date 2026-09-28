import type { ReactNode } from 'react'
import type { AccessRequest } from '../types.ts'
import { formatDateTime } from '../format.ts'
import { ApprovalProgress } from './ApprovalProgress.tsx'
import { StatusBadge } from './StatusBadge.tsx'

interface Props {
  request: AccessRequest
  showRequester?: boolean
  /** Extra content under the details, e.g. approve/reject controls. */
  children?: ReactNode
}

export function RequestCard({ request, showRequester = false, children }: Props) {
  return (
    <article className="card request-card">
      <header className="request-head">
        <div>
          <h3>{request.accessType.name}</h3>
          <div className="muted">
            #{request.id}
            {showRequester && <> · {request.requester.fullName}</>} · submitted{' '}
            {formatDateTime(request.createdAt)}
          </div>
        </div>
        <StatusBadge status={request.status} />
      </header>
      <p className="reason">
        <span className="label">Reason</span>
        {request.reason}
      </p>
      <ApprovalProgress request={request} />
      {children}
    </article>
  )
}

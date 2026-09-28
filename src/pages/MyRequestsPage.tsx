import { Fragment, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { api } from '../api/index.ts'
import { useErrorHandler } from '../auth/context.ts'
import { ApprovalProgress } from '../components/ApprovalProgress.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { formatDateTime } from '../format.ts'
import type { AccessRequest } from '../types.ts'

export function MyRequestsPage() {
  const handleError = useErrorHandler()
  const flash = (useLocation().state as { flash?: string } | null)?.flash
  const [requests, setRequests] = useState<AccessRequest[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    api.listMyRequests().then(
      (result) => {
        if (!cancelled) setRequests(result)
      },
      (err) => {
        if (!cancelled) setLoadError(handleError(err))
      },
    )
    return () => {
      cancelled = true
    }
  }, [handleError])

  return (
    <section className="stack">
      <div className="page-head">
        <h2>My requests</h2>
        <Link to="/request-access" className="btn btn-primary">
          New request
        </Link>
      </div>

      {flash && (
        <div className="alert alert-success" role="status">
          {flash}
        </div>
      )}
      {loadError && <div className="alert alert-error">{loadError}</div>}
      {requests === null && !loadError && <p className="muted">Loading…</p>}
      {requests?.length === 0 && (
        <p className="empty">
          You haven't requested any access yet. <Link to="/request-access">Request access</Link>
        </p>
      )}

      {requests && requests.length > 0 && (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Access</th>
                <th>Reason</th>
                <th>Request date</th>
                <th>Status</th>
                <th aria-label="Details" />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const expanded = expandedId === r.id
                return (
                  <Fragment key={r.id}>
                    <tr>
                      <td className="nowrap">#{r.id}</td>
                      <td className="nowrap">{r.accessType.name}</td>
                      <td className="reason-cell">{r.reason}</td>
                      <td className="nowrap">{formatDateTime(r.createdAt)}</td>
                      <td>
                        <StatusBadge status={r.status} />
                        {r.currentStep && (
                          <div className="muted step-hint">
                            Waiting for {r.currentStep === 'MANAGER' ? 'manager' : 'admin'}
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="link"
                          aria-expanded={expanded}
                          onClick={() => setExpandedId(expanded ? null : r.id)}
                        >
                          {expanded ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="detail-row">
                        <td colSpan={6}>
                          <ApprovalProgress request={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

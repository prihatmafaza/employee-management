import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/index.ts'
import { useAuth, useErrorHandler } from '../auth/context.ts'
import { RequestCard } from '../components/RequestCard.tsx'
import type { Decision, RequestStatus, ReviewItem } from '../types.ts'

type Tab = 'pending' | 'all'
type StatusFilter = RequestStatus | 'ALL'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

export function ApproveRequestPage() {
  const { user } = useAuth()
  const handleError = useErrorHandler()
  const [items, setItems] = useState<ReviewItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('pending')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  // Bumped after a decision to refetch the list.
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false
    api.listReviewItems().then(
      (result) => {
        if (cancelled) return
        setItems(result)
        setLoadError(null)
      },
      (err) => {
        if (!cancelled) setLoadError(handleError(err))
      },
    )
    return () => {
      cancelled = true
    }
  }, [handleError, reloadKey])

  const pending = items?.filter((i) => i.canAct) ?? []
  const shown =
    tab === 'pending'
      ? pending
      : (items ?? []).filter((i) => statusFilter === 'ALL' || i.status === statusFilter)

  const scopeText =
    user.role === 'ADMIN'
      ? 'Requests approved by a manager are waiting here for final admin approval.'
      : 'Requests from your team are waiting here for your approval before they go to an admin.'

  return (
    <div className="stack">
      <div>
        <h2>Approve requests</h2>
        <p className="muted">{scopeText}</p>
      </div>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'pending'}
            className={`tab${tab === 'pending' ? ' active' : ''}`}
            onClick={() => setTab('pending')}
          >
            Waiting for me <span className="count">{pending.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'all'}
            className={`tab${tab === 'all' ? ' active' : ''}`}
            onClick={() => setTab('all')}
          >
            All requests
          </button>
        </div>
        {tab === 'all' && (
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {loadError && <div className="alert alert-error">{loadError}</div>}
      {items === null && !loadError && <p className="muted">Loading…</p>}
      {items !== null && shown.length === 0 && (
        <p className="empty">
          {tab === 'pending' ? 'Nothing is waiting for your decision.' : 'No requests to show.'}
        </p>
      )}

      {shown.map((item) => (
        <RequestCard key={item.id} request={item} showRequester>
          {item.canAct && <DecisionForm requestId={item.id} onDecided={reload} />}
        </RequestCard>
      ))}
    </div>
  )
}

function DecisionForm({ requestId, onDecided }: { requestId: number; onDecided(): void }) {
  const handleError = useErrorHandler()
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState<Decision | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function decide(decision: Decision) {
    if (decision === 'REJECTED' && !comment.trim()) {
      setError('Please give a reason for the rejection.')
      return
    }
    setBusy(decision)
    setError(null)
    try {
      await api.decide(requestId, decision, comment)
      // The card leaves the "waiting" list once the list refetches.
      onDecided()
    } catch (err) {
      setError(handleError(err))
      setBusy(null)
    }
  }

  return (
    <div className="decision">
      <label className="field">
        <span>Comment (required when rejecting)</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={500}
        />
      </label>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      <div className="decision-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy !== null}
          onClick={() => void decide('APPROVED')}
        >
          {busy === 'APPROVED' ? 'Approving…' : 'Approve'}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={busy !== null}
          onClick={() => void decide('REJECTED')}
        >
          {busy === 'REJECTED' ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
    </div>
  )
}

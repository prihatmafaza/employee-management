import { useEffect, useState } from 'react'
import { api } from '../api/index.ts'
import { useErrorHandler } from '../auth/context.ts'
import { formatTime } from '../format.ts'
import type { DashboardSummary, RequestStatus, SummaryScope } from '../types.ts'

const REFRESH_SECONDS = 10

const SCOPE_TEXT: Record<SummaryScope, string> = {
  SYSTEM: 'All access requests in the system.',
  TEAM: 'Access requests from your team.',
  MINE: 'Your own access requests.',
}

export function DashboardPage() {
  const handleError = useErrorHandler()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Bumped by the Refresh button to fetch now and restart the timer.
  const [reloadKey, setReloadKey] = useState(0)

  // Keeps the numbers live: fetch on load, every REFRESH_SECONDS while the tab
  // is visible, and as soon as the user comes back to the tab.
  useEffect(() => {
    let cancelled = false
    const load = () => {
      if (document.hidden) return
      api.getDashboardSummary().then(
        (result) => {
          if (cancelled) return
          setSummary(result)
          setError(null)
        },
        (err) => {
          if (!cancelled) setError(handleError(err))
        },
      )
    }
    load()
    const timer = setInterval(load, REFRESH_SECONDS * 1000)
    document.addEventListener('visibilitychange', load)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', load)
    }
  }, [handleError, reloadKey])

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <h2>Dashboard</h2>
          {summary && <p className="muted">{SCOPE_TEXT[summary.scope]}</p>}
        </div>
        <div className="refresh">
          {summary && (
            <span className="muted" aria-live="polite">
              Updated {formatTime(summary.generatedAt)} · refreshes every {REFRESH_SECONDS}s
            </span>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => setReloadKey((k) => k + 1)}>
            Refresh
          </button>
        </div>
      </div>

      {/* Keep showing the last numbers if a background refresh fails. */}
      {error && <div className="alert alert-error">{error}</div>}
      {!summary && !error && <p className="muted">Loading…</p>}

      {summary && (
        <>
          <div className="tile tile-hero">
            <span className="tile-label">Total requests</span>
            <span className="tile-value">{summary.total}</span>
            <span className="muted">Submitted {summary.scope === 'MINE' ? 'by you' : 'so far'}</span>
          </div>

          <div className="tile-grid">
            <StatTile
              label="In progress"
              value={summary.inProgress}
              of={summary.total}
              ofLabel="total"
              status="IN_PROGRESS"
            />
            <StatTile
              label="Approved"
              value={summary.approved}
              of={summary.total}
              ofLabel="total"
              status="APPROVED"
            />
            <StatTile
              label="Rejected"
              value={summary.rejected}
              of={summary.total}
              ofLabel="total"
              status="REJECTED"
            />
          </div>

          <h3 className="section-title">In progress, by approval step</h3>
          <div className="tile-grid">
            <StatTile
              label="Waiting for manager approval"
              value={summary.waitingManager}
              of={summary.inProgress}
              ofLabel="in progress"
            />
            <StatTile
              label="Waiting for admin approval"
              value={summary.waitingAdmin}
              of={summary.inProgress}
              ofLabel="in progress"
            />
          </div>
        </>
      )}
    </section>
  )
}

interface StatTileProps {
  label: string
  value: number
  /** The total this value is a share of, shown as a percentage. */
  of: number
  ofLabel: string
  status?: RequestStatus
}

function StatTile({ label, value, of, ofLabel, status }: StatTileProps) {
  const share = of > 0 ? Math.round((value / of) * 100) : null
  return (
    <div className="tile">
      <span className="tile-label">
        {status && <span className={`dot dot-${status.toLowerCase()}`} aria-hidden="true" />}
        {label}
      </span>
      <span className="tile-value">{value}</span>
      <span className="muted">{share === null ? '—' : `${share}% of ${ofLabel}`}</span>
    </div>
  )
}

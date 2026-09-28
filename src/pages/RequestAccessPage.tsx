import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../api/index.ts'
import { useErrorHandler } from '../auth/context.ts'
import type { AccessType, RequestStatus } from '../types.ts'

const MAX_REASON_LENGTH = 500

export function RequestAccessPage() {
  const handleError = useErrorHandler()
  const navigate = useNavigate()
  const [accessTypes, setAccessTypes] = useState<AccessType[] | null>(null)
  // An access can't be requested again while a request for it is pending or approved.
  const [blocked, setBlocked] = useState(new Map<number, RequestStatus>())
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.listAccessTypes(), api.listMyRequests()]).then(
      ([types, mine]) => {
        if (cancelled) return
        setAccessTypes(types)
        setBlocked(
          new Map(
            mine.filter((r) => r.status !== 'REJECTED').map((r) => [r.accessType.id, r.status]),
          ),
        )
      },
      (err) => {
        if (!cancelled) setLoadError(handleError(err))
      },
    )
    return () => {
      cancelled = true
    }
  }, [handleError])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (selectedId === null) {
      setFormError('Please select an access.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const created = await api.submitRequest({ accessTypeId: selectedId, reason })
      navigate('/my-requests', {
        state: {
          flash: `Request #${created.id} for ${created.accessType.name} was sent to your manager.`,
        },
      })
    } catch (err) {
      setFormError(handleError(err))
      setSubmitting(false)
    }
  }

  return (
    <section className="card">
      <h2>Request access</h2>
      {loadError && <div className="alert alert-error">{loadError}</div>}
      {accessTypes === null && !loadError && <p className="muted">Loading…</p>}
      {accessTypes && (
        <form onSubmit={handleSubmit} className="stack">
          <fieldset className="access-grid">
            <legend className="label">Available access</legend>
            {accessTypes.map((a) => {
              const blockedStatus = blocked.get(a.id)
              return (
                <label
                  key={a.id}
                  className={`access-option${selectedId === a.id ? ' selected' : ''}${blockedStatus ? ' disabled' : ''}`}
                >
                  <input
                    type="radio"
                    name="access"
                    value={a.id}
                    checked={selectedId === a.id}
                    disabled={!!blockedStatus}
                    onChange={() => setSelectedId(a.id)}
                  />
                  <strong>{a.name}</strong>
                  <span className="muted">{a.description}</span>
                  {blockedStatus && (
                    <span className="access-note">
                      {blockedStatus === 'APPROVED' ? 'You already have this' : 'Request in progress'}
                    </span>
                  )}
                </label>
              )
            })}
          </fieldset>

          <label className="field">
            <span>Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={MAX_REASON_LENGTH}
              rows={3}
              placeholder="Why do you need this access?"
              required
            />
            <span className="muted counter">
              {reason.length}/{MAX_REASON_LENGTH}
            </span>
          </label>

          {formError && (
            <div className="alert alert-error" role="alert">
              {formError}
            </div>
          )}

          <div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

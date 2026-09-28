import type { AccessRequest, ApprovalStep } from '../types.ts'
import { formatDateTime } from '../format.ts'

const STEPS: { step: ApprovalStep; label: string }[] = [
  { step: 'MANAGER', label: 'Manager approval' },
  { step: 'ADMIN', label: 'Admin approval' },
]

type StepState = 'done' | 'rejected' | 'current' | 'waiting' | 'skipped'

function stepState(request: AccessRequest, step: ApprovalStep): StepState {
  const approval = request.approvals.find((a) => a.step === step)
  if (approval) return approval.decision === 'APPROVED' ? 'done' : 'rejected'
  if (request.currentStep === step) return 'current'
  return request.status === 'REJECTED' ? 'skipped' : 'waiting'
}

const STATE_TEXT: Record<StepState, string> = {
  done: 'Approved',
  rejected: 'Rejected',
  current: 'Waiting for decision',
  waiting: 'Not started',
  skipped: 'Not needed',
}

/** Shows Submitted → Manager → Admin, with who decided each step and their comment. */
export function ApprovalProgress({ request }: { request: AccessRequest }) {
  return (
    <ol className="progress">
      <li className="progress-step progress-done">
        <span className="progress-dot" aria-hidden="true" />
        <div>
          <strong>Submitted</strong>
          <div className="muted">
            {request.requester.fullName} · {formatDateTime(request.createdAt)}
          </div>
        </div>
      </li>
      {STEPS.map(({ step, label }) => {
        const state = stepState(request, step)
        const approval = request.approvals.find((a) => a.step === step)
        return (
          <li key={step} className={`progress-step progress-${state}`}>
            <span className="progress-dot" aria-hidden="true" />
            <div>
              <strong>{label}</strong>
              <div className="muted">
                {STATE_TEXT[state]}
                {approval && ` by ${approval.approver.fullName} · ${formatDateTime(approval.decidedAt)}`}
              </div>
              {approval?.comment && <blockquote>{approval.comment}</blockquote>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

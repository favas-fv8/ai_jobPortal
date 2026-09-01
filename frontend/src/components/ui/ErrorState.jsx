import { AlertIcon } from '../Icons'

export default function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }) {
  return (
    <div className="error-state">
      <div className="empty-icon" style={{ color: 'var(--danger)' }}>
        <AlertIcon size={28} />
      </div>
      <p className="text-lg bold">{message}</p>
      {onRetry && (
        <button className="btn btn-outline" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

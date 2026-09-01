export function matchScoreColor(score) {
  if (score === null || score === undefined) return 'low'
  if (score >= 70) return 'high'
  if (score >= 40) return 'mid'
  return 'low'
}

export default function MatchScore({ score, showLabel = true }) {
  const value = score ?? 0
  const barClass = matchScoreColor(value)
  const color =
    value >= 70 ? 'var(--success)' : value >= 40 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div style={{ minWidth: 120 }}>
      {showLabel && (
        <div className="flex-between mb-1">
          <span className="text-xs muted">AI Match</span>
          <span className="text-sm bold" style={{ color }}>{Math.round(value)}%</span>
        </div>
      )}
      <div className="progress">
        <div
          className={`progress-fill ${barClass}`}
          style={showLabel ? { width: `${Math.max(value, 3)}%` } : { width: `${Math.max(value, 3)}%`, height: 10 }}
        />
      </div>
      {!showLabel && <span className="text-sm bold" style={{ color }}>{Math.round(value)}%</span>}
    </div>
  )
}

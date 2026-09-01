const badgeMap = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  primary: 'badge-primary',
  secondary: 'badge-secondary',
}

export default function Badge({ color = 'secondary', children, className = '' }) {
  return <span className={`badge ${badgeMap[color] || 'badge-secondary'} ${className}`}>{children}</span>
}

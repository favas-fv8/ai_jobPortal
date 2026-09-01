import Badge from './Badge'

export default function Alert({ type = 'info', children }) {
  return <div className={`alert alert-${type}`}>{children}</div>
}

export function AlertInline({ type = 'info', children }) {
  return <div className={`alert alert-${type}`}>{children}</div>
}

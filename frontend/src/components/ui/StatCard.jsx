const iconMap = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
}

export default function StatCard({ label, value, icon: IconComponent, color = 'primary', sub }) {
  return (
    <div className="card stat-card">
      <div className={`stat-icon ${iconMap[color] || 'primary'}`}>
        <IconComponent size={24} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-label">{sub}</div>}
      </div>
    </div>
  )
}

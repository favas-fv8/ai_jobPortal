export default function EmptyState({ icon: IconComponent, title, description, action }) {
  return (
    <div className="empty-state">
      {IconComponent && (
        <div className="empty-icon">
          <IconComponent size={30} />
        </div>
      )}
      {title && <p className="text-lg bold">{title}</p>}
      {description && <p className="text-sm muted" style={{ maxWidth: 420 }}>{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

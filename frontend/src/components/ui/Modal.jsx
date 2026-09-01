import { CloseIcon } from '../Icons'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, footer, size = '' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={size === 'lg' ? { maxWidth: 760 } : size === 'sm' ? { maxWidth: 420 } : {}}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header">
            <h3 className="card-title">{title}</h3>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <CloseIcon size={18} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

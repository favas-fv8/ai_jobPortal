import { useTheme } from '../../context/ThemeContext'

export default function Logo({ size = 32, textSize = '18px', showText = true }) {
  const { dark } = useTheme()
  return (
    <div className="brand" style={{ gap: 10 }}>
      <div className="brand-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size}>
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6366f1" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="14" fill="url(#lg)" />
          <path d="M22 46 V26 Q22 20 28 20 H36 Q42 20 42 26 V46" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="26" cy="30" r="2.5" fill="#fff" />
          <circle cx="32" cy="30" r="2.5" fill="#fff" />
          <circle cx="38" cy="30" r="2.5" fill="#fff" />
          <path d="M26 36 h12 M26 40 h9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      {showText && (
        <span className="brand-text" style={{ fontSize: textSize }}>
          AI-<span className="ai">JobPortal</span>
        </span>
      )}
    </div>
  )
}

import type { ReactNode } from 'react'

type Props = {
  label: string
  borderColor: string
  dotStyle: React.CSSProperties
  dotContent?: ReactNode
  onClick?: () => void
  disabled?: boolean
}

export default function ActionButton({ label, borderColor, dotStyle, dotContent, onClick, disabled }: Props) {
  return (
    <button
      className="action-btn"
      style={{ borderColor, opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="action-dot" style={dotStyle}>
        {dotContent}
      </span>
      <span className="action-label">{label}</span>
    </button>
  )
}

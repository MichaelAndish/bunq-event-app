import type { ReactNode } from 'react'

type Props = {
  title?: string
  badge?: string
  children: ReactNode
}

export default function FormCard({ title, badge, children }: Props) {
  return (
    <div className="form-card">
      {(title || badge) && (
        <div className="form-card-header">
          {title && <h3 className="form-card-title">{title}</h3>}
          {badge && <span className="form-card-badge">{badge}</span>}
        </div>
      )}
      {children}
    </div>
  )
}

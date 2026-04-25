import type { ReactNode } from 'react'
import { ChevronLeftIcon } from './Icons'

type Props = { onBack?: () => void; title: string; right?: ReactNode }

export default function PageHeader({ onBack, title, right }: Props) {
  return (
    <div className="page-header">
      {onBack
        ? <button className="topbar-back-btn" onClick={onBack}><ChevronLeftIcon size={18} color="#fff" /></button>
        : <div style={{ width: 32 }} />
      }
      <span className="page-header-title">{title}</span>
      <div className="page-header-right">
        {right ?? <div style={{ width: 32 }} />}
      </div>
    </div>
  )
}

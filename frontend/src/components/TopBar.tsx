import { ChevronLeftIcon, QRCodeIcon } from './Icons'

type Props = { onBack?: () => void }

export default function TopBar({ onBack }: Props = {}) {
  return (
    <div className="topbar">
      <div style={{ width: 36, flexShrink: 0 }}>
        {onBack ? (
          <button className="topbar-back-btn" onClick={onBack}>
            <ChevronLeftIcon size={18} color="#fff" />
          </button>
        ) : (
          <div className="topbar-avatar" style={{ opacity: 0.35, cursor: 'not-allowed' }} />
        )}
      </div>

      <span className="topbar-company">Big Money Festivals B.V.</span>

      <div className="topbar-icon-btn" style={{ flexShrink: 0, opacity: 0.35, cursor: 'not-allowed' }}>
        <QRCodeIcon size={22} color="#8e8e93" />
      </div>
    </div>
  )
}

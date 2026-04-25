import PageHeader from '../components/PageHeader'
import { CalendarIcon, ChevronRightIcon } from '../components/Icons'
import type { Page } from '../App'

type Props = { onBack: () => void; onNavigate: (page: Page) => void }

export default function BuyTicket({ onBack, onNavigate }: Props) {
  return (
    <div>
      <PageHeader title="Buy ticket" />

      {/* Gradient border payment card */}
      <div className="gradient-card-wrap">
        <div className="gradient-card-inner">
          <div className="pay-card-event-row">
            <CalendarIcon size={16} color="#8e8e93" />
            <span className="pay-card-event-name">Pro Vibes - bunq demo day</span>
          </div>
          <div className="pay-card-amount">
            <span className="pay-card-amount-main">€69</span>
            <span className="pay-card-amount-cents">.00</span>
          </div>
        </div>
      </div>

      {/* Accept / Decline buttons */}
      <div className="pay-action-pair">
        <button className="pay-decline-btn" onClick={() => onNavigate('payment-rejected')}>
          <span className="pay-decline-x">✕</span>
        </button>
        <button className="pay-accept-btn" onClick={() => onNavigate('payment-success')}>
          <span className="pay-accept-check">✓</span>
        </button>
      </div>

      {/* Pay To */}
      <p className="pay-section-label">PAY TO</p>
      <div className="form-card pay-to-card">
        <div className="pay-to-row">
          <div className="pay-to-avatar">
            <div className="pay-to-logo" />
          </div>
          <div className="pay-to-info">
            <p className="pay-to-name">Big Money Festivals B.V.</p>
            <p className="pay-to-iban">NL78 BUNQ 0123 4567 89</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="form-card">
        <div className="pay-detail-row">
          <span className="pay-detail-label">Bank Account</span>
          <div className="pay-detail-val-group">
            <span className="pay-detail-val">
              Personal Account
              <ChevronRightIcon size={14} color="#8e8e93" />
            </span>
            <span className="pay-detail-sub">€12,450.80</span>
          </div>
        </div>

        <div className="list-separator" style={{ margin: '12px 0' }} />

        <div className="pay-detail-row">
          <span className="pay-detail-label">Created On</span>
          <span className="pay-detail-val">Today at 20:55</span>
        </div>

        <div className="list-separator" style={{ margin: '12px 0' }} />

        <div className="pay-detail-row">
          <span className="pay-detail-label">Expires</span>
          <span className="pay-detail-val">May 21, 2026 at 20:55</span>
        </div>
      </div>

      <button className="pay-other-bank-btn">Pay with another bank</button>
    </div>
  )
}

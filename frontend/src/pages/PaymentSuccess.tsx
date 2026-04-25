import PageHeader from '../components/PageHeader'
import { CalendarIcon } from '../components/Icons'
import type { Page } from '../App'

type Props = { onBack: () => void; onNavigate: (page: Page) => void }

export default function PaymentSuccess({ onBack, onNavigate }: Props) {
  return (
    <div>
      <PageHeader title="Payment Successful" />

      {/* Gradient border success card */}
      <div className="gradient-card-wrap gradient-card-green">
        <div className="gradient-card-inner">
          <div className="success-check-row">
            <div className="success-check-circle">
              <span className="success-check-mark">✓</span>
            </div>
            <div>
              <p className="success-pay-title">Payment complete</p>
              <p className="success-pay-sub">Your ticket is ready</p>
            </div>
          </div>

          <p className="success-pay-event">Pro Vibes - bunq demo day</p>

          <div className="pay-card-amount" style={{ marginBottom: 0 }}>
            <span className="pay-card-amount-main">€69</span>
            <span className="pay-card-amount-cents">.00</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="pay-action-pair">
        <button className="success-details-btn" onClick={() => onNavigate('guest-preview')}>
          See Event Details
        </button>
        <button className="success-calendar-btn">
          Add to Calendar
        </button>
      </div>

      {/* Summary card */}
      <div className="form-card">
        <p className="pay-section-label" style={{ marginBottom: 12, padding: 0, fontSize: 11 }}>SUMMARY</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarIcon size={16} color="#8e8e93" />
          <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500 }}>
            Pro Vibes - bunq demo day
          </span>
        </div>
      </div>
    </div>
  )
}

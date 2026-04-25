import PageHeader from '../components/PageHeader'
import { ChevronRightIcon } from '../components/Icons'
import type { Page } from '../App'

type Props = { onBack: () => void; onNavigate: (page: Page) => void }

export default function PaymentRejected({ onBack, onNavigate }: Props) {
  return (
    <div>
      <PageHeader title="Buy ticket" />

      {/* Rejection state card */}
      <div className="form-card reject-card">
        <div className="reject-icon-circle">
          <span className="reject-x">✕</span>
        </div>
        <h2 className="reject-title">Payment Rejected</h2>
        <p className="reject-sub">The transaction was declined by your bank.</p>
      </div>

      {/* Retry */}
      <div style={{ padding: '0 20px 16px' }}>
        <button className="submit-btn" style={{ width: '100%', margin: 0 }} onClick={() => onNavigate('guest-preview')}>
          Retry Payment
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

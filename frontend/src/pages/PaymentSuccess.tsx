import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import { CalendarIcon, LocationPinIcon } from '../components/Icons'
import { api } from '../api/client'
import type { TicketRow } from '../api/client'
import type { Page } from '../App'

type Props = { mock: boolean; ticketId?: string | null; onBack: () => void; onNavigate: (page: Page) => void }

export default function PaymentSuccess({ mock, ticketId, onBack, onNavigate }: Props) {
  const [ticket,  setTicket]  = useState<TicketRow | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mock || !ticketId) return
    setLoading(true)
    api.getTicket(ticketId)
      .then(setTicket)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mock, ticketId])

  if (!mock && !ticketId) return (
    <div>
      <PageHeader title="Payment Successful" onBack={onBack} />
      <div className="list-card" style={{ margin: '0 20px' }}>
        <div className="list-row" style={{ color: '#30d158', fontSize: 14 }}>
          <span style={{ padding: '8px 0' }}>Your payment was processed successfully.</span>
        </div>
      </div>
    </div>
  )

  const displayEvent = mock ? 'Pro Vibes - bunq demo day' : (ticket?.event.name ?? '—')
  const displayTier  = mock ? 'General Admission'         : (ticket?.tier.name  ?? '—')
  const displayPrice = mock ? '69.00' : ticket ? parseFloat(ticket.tier.price).toFixed(2) : '0.00'
  const displayDate  = mock ? 'Sat, 25 Apr • 14:00'       : (ticket?.event.date     ?? '')
  const displayLoc   = mock ? 'bunq HQ, Amsterdam'        : (ticket?.event.location ?? '')
  const [priceMain, priceCents = '00'] = displayPrice.split('.')

  return (
    <div>
      <PageHeader title="Payment Successful" onBack={onBack} />

      {/* Gradient success card */}
      <div className="gradient-card-wrap gradient-card-green">
        <div className="gradient-card-inner">
          <div className="success-check-row">
            <div className="success-check-circle">
              <span className="success-check-mark">✓</span>
            </div>
            <div>
              <p className="success-pay-title">Payment complete</p>
              <p className="success-pay-sub">
                {loading ? 'Loading ticket…' : `Ticket for ${displayTier}`}
              </p>
            </div>
          </div>

          <p className="success-pay-event">{displayEvent}</p>

          <div className="pay-card-amount" style={{ marginBottom: 0 }}>
            <span className="pay-card-amount-main">€{priceMain}</span>
            <span className="pay-card-amount-cents">.{priceCents}</span>
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

        {(displayDate || displayLoc) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {displayDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarIcon size={14} color="#8e8e93" />
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{displayDate}</span>
              </div>
            )}
            {displayLoc && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LocationPinIcon size={14} color="#8e8e93" />
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{displayLoc}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarIcon size={16} color="#8e8e93" />
          <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500 }}>{displayEvent}</span>
        </div>

        {ticket && (
          <>
            <div className="list-separator" style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Ticket holder</span>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{ticket.buyerName}</span>
            </div>
            <div className="list-separator" style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Confirmation</span>
              <span style={{ color: 'var(--text)', fontWeight: 500, fontFamily: 'monospace', fontSize: 12 }}>
                {ticket.id.split('-')[0].toUpperCase()}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

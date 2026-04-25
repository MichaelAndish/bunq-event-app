import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import { CalendarIcon, ChevronRightIcon } from '../components/Icons'
import { api } from '../api/client'
import type { Page } from '../App'

type Props = { mock: boolean; eventId?: string | null; tierId?: string | null; onBack: () => void; onNavigate: (page: Page) => void }

export default function BuyTicket({ mock, eventId, tierId, onBack, onNavigate }: Props) {
  const [tierName,   setTierName]   = useState('')
  const [tierPrice,  setTierPrice]  = useState('')
  const [eventTitle, setEventTitle] = useState('')
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    if (mock || !eventId) return
    setLoading(true)
    api.getEvent(eventId)
      .then(e => {
        setEventTitle(e.name)
        const tier = tierId ? e.tiers.find(t => t.id === tierId) : e.tiers[0]
        if (tier) {
          setTierName(tier.name)
          setTierPrice(parseFloat(tier.price).toFixed(2))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mock, eventId, tierId])

  if (!mock && !eventId) return (
    <div>
      <PageHeader title="Buy ticket" onBack={onBack} />
      <div className="list-card" style={{ margin: '0 20px' }}>
        <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
          <span style={{ padding: '8px 0' }}>Select a ticket from an event to purchase it.</span>
        </div>
      </div>
    </div>
  )

  if (!mock && loading) return (
    <div>
      <PageHeader title="Buy ticket" onBack={onBack} />
      <div className="list-card" style={{ margin: '0 20px' }}>
        <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
          <span style={{ padding: '8px 0' }}>Loading…</span>
        </div>
      </div>
    </div>
  )

  const displayEvent = mock ? 'Pro Vibes - bunq demo day' : eventTitle
  const displayTier  = mock ? 'General Admission'         : tierName
  const displayPrice = mock ? '69'                        : tierPrice
  const [priceMain, priceCents = '00'] = displayPrice.split('.')

  return (
    <div>
      <PageHeader title="Buy ticket" onBack={onBack} />

      {/* Gradient border payment card */}
      <div className="gradient-card-wrap">
        <div className="gradient-card-inner">
          <div className="pay-card-event-row">
            <CalendarIcon size={16} color="#8e8e93" />
            <span className="pay-card-event-name">{displayTier} — {displayEvent}</span>
          </div>
          <div className="pay-card-amount">
            <span className="pay-card-amount-main">€{priceMain}</span>
            <span className="pay-card-amount-cents">.{priceCents}</span>
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

import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import { CalendarIcon, ChevronRightIcon } from '../components/Icons'
import { api } from '../api/client'
import type { Page } from '../App'

type Props = {
  mock: boolean
  eventId?: string | null
  tierId?: string | null
  onBack: () => void
  onNavigate: (page: Page) => void
  onTicketCreated?: (ticketId: string) => void
}

export default function BuyTicket({ mock, eventId, tierId, onBack, onNavigate, onTicketCreated }: Props) {
  const [tierName,    setTierName]    = useState('')
  const [tierPrice,   setTierPrice]   = useState('')
  const [eventTitle,  setEventTitle]  = useState('')
  const [loading,     setLoading]     = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')
  const [buyerName,   setBuyerName]   = useState('')
  const [buyerEmail,  setBuyerEmail]  = useState('')

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

  const handleAccept = async () => {
    if (mock) { onNavigate('payment-success'); return }
    if (!tierId) { setError('No ticket tier selected.'); return }
    if (!buyerName.trim()) { setError('Please enter your name.'); return }
    if (!buyerEmail.trim() || !buyerEmail.includes('@')) { setError('Please enter a valid email.'); return }

    setSubmitting(true)
    setError('')
    try {
      const ticket = await api.createTicket(tierId, buyerName.trim(), buyerEmail.trim())
      onTicketCreated?.(ticket.id)
      onNavigate('payment-success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg.includes('sold out') ? 'Sorry, this tier is sold out.' : 'Payment could not be processed. Please try again.')
      setSubmitting(false)
    }
  }

  const displayEvent = mock ? 'Pro Vibes - bunq demo day' : eventTitle
  const displayTier  = mock ? 'General Admission'         : tierName
  const displayPrice = mock ? '69.00'                     : tierPrice
  const [priceMain, priceCents = '00'] = displayPrice.split('.')

  return (
    <div>
      <PageHeader title="Buy ticket" onBack={onBack} />

      {/* Buyer details — only shown in real flow */}
      {!mock && (
        <div className="form-card" style={{ margin: '0 20px 16px' }}>
          <p className="pay-section-label" style={{ padding: 0, marginBottom: 12, fontSize: 11 }}>YOUR DETAILS</p>
          <div className="field-group" style={{ marginBottom: 12 }}>
            <label className="field-label">Full name</label>
            <input
              className="field-input"
              placeholder="Jane Smith"
              value={buyerName}
              onChange={e => setBuyerName(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              placeholder="jane@example.com"
              value={buyerEmail}
              onChange={e => setBuyerEmail(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
      )}

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

      {error && (
        <p style={{ color: '#ff453a', fontSize: 13, textAlign: 'center', margin: '8px 20px 0' }}>{error}</p>
      )}

      {/* Accept / Decline buttons */}
      <div className="pay-action-pair">
        <button
          className="pay-decline-btn"
          onClick={() => onNavigate('payment-rejected')}
          disabled={submitting}
        >
          <span className="pay-decline-x">✕</span>
        </button>
        <button
          className="pay-accept-btn"
          onClick={handleAccept}
          disabled={submitting}
          style={submitting ? { opacity: 0.6 } : undefined}
        >
          {submitting
            ? <span style={{ fontSize: 18, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            : <span className="pay-accept-check">✓</span>
          }
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
          <span className="pay-detail-label">Tier</span>
          <span className="pay-detail-val">{displayTier}</span>
        </div>

        <div className="list-separator" style={{ margin: '12px 0' }} />

        <div className="pay-detail-row">
          <span className="pay-detail-label">Event</span>
          <span className="pay-detail-val">{displayEvent}</span>
        </div>
      </div>

      <button className="pay-other-bank-btn">Pay with another bank</button>
    </div>
  )
}

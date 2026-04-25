import { useState, useEffect } from 'react'
import { ChevronLeftIcon, CalendarIcon, LocationPinIcon, InfoCircleIcon } from '../components/Icons'
import { api } from '../api/client'
import type { Page } from '../App'

type Tier = { id: string; name: string; price: string; currency: string }

const MOCK_TICKETS = [
  { id: 'free',    name: 'Free entrance',     desc: 'Pay nothing its fun here',         price: null,  features: [] },
  { id: 'general', name: 'General Admission', desc: 'Access to main demo stage',        price: 69,    features: [] },
  { id: 'vip',     name: 'VIP Table',         desc: 'Premium experience',               price: 420,   features: ['Drinks & food', 'Best view of stage', 'Massage'] },
]

type Props = {
  mock: boolean
  eventId?: string | null
  onBack: () => void
  onNavigate: (page: Page) => void
  onSelectTier?: (tierId: string) => void
}

export default function GuestPreview({ mock, eventId, onBack, onNavigate, onSelectTier }: Props) {
  const [eventName,     setEventName]     = useState('')
  const [eventDate,     setEventDate]     = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [bannerUrl,     setBannerUrl]     = useState<string | null>(null)
  const [tiers,         setTiers]         = useState<Tier[]>([])
  const [loading,       setLoading]       = useState(false)

  useEffect(() => {
    if (mock || !eventId) return
    setLoading(true)
    api.getEvent(eventId)
      .then(e => {
        setEventName(e.name)
        setEventDate(e.date)
        setEventLocation(e.location)
        setBannerUrl(e.bannerUrl)
        setTiers(e.tiers)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mock, eventId])

  if (!mock && !eventId) return (
    <div>
      <button className="topbar-back-btn" onClick={onBack} style={{ margin: '16px 0 0 16px' }} />
      <h1 className="page-title">Event Preview</h1>
      <div className="list-card" style={{ margin: '0 20px' }}>
        <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
          <span style={{ padding: '8px 0' }}>Select an event to preview the guest view.</span>
        </div>
      </div>
    </div>
  )

  if (!mock && loading) return (
    <div>
      <div className="event-hero" style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}>
        <button className="topbar-back-btn guest-hero-back" onClick={onBack}>
          <ChevronLeftIcon size={18} color="#fff" />
        </button>
      </div>
      <div className="guest-content">
        <p style={{ color: '#8e8e93', fontSize: 14 }}>Loading…</p>
      </div>
    </div>
  )

  const handleBuyTier = (tierId: string) => {
    onSelectTier?.(tierId)
    onNavigate('buy-ticket')
  }

  // Real event view
  if (!mock) return (
    <div>
      <div className="event-hero" style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}>
        <button className="topbar-back-btn guest-hero-back" onClick={onBack}>
          <ChevronLeftIcon size={18} color="#fff" />
        </button>
      </div>
      <div className="guest-content">
        <h1 className="guest-title">{eventName}</h1>
        <div className="guest-meta">
          <span className="guest-meta-item">
            <CalendarIcon size={14} color="#8e8e93" />
            {eventDate}
          </span>
          <span className="guest-meta-item">
            <LocationPinIcon size={14} color="#8e8e93" />
            {eventLocation}
          </span>
        </div>

        <h2 className="tickets-heading">Tickets</h2>

        {tiers.length === 0 && (
          <p style={{ color: '#8e8e93', fontSize: 14 }}>No ticket tiers available.</p>
        )}

        {tiers.map(({ id, name, price }) => {
          const priceNum = parseFloat(price)
          const isFree   = priceNum === 0
          return (
            <div key={id} className="ticket-card">
              <div className="ticket-header">
                <div>
                  <p className="ticket-name">{name}</p>
                </div>
                <div className="ticket-price-col">
                  <span className={`ticket-price${isFree ? ' free' : ''}`}>
                    {isFree ? 'Free' : `€${priceNum.toFixed(2)}`}
                  </span>
                  <InfoCircleIcon size={16} color="#0a84ff" />
                </div>
              </div>
              <button
                className="guest-buy-btn"
                style={{ marginTop: 10, position: 'static', width: '100%' }}
                onClick={() => handleBuyTier(id)}
              >
                Get Ticket
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )

  // Mock view
  return (
    <div>
      <div className="event-hero">
        <button className="topbar-back-btn guest-hero-back" onClick={onBack}>
          <ChevronLeftIcon size={18} color="#fff" />
        </button>
      </div>
      <div className="guest-content">
        <h1 className="guest-title">bunq demo day</h1>
        <div className="guest-meta">
          <span className="guest-meta-item">
            <CalendarIcon size={14} color="#8e8e93" />
            25 Apr • 14:00
          </span>
          <span className="guest-meta-item">
            <LocationPinIcon size={14} color="#8e8e93" />
            bunq HQ, Amsterdam
          </span>
        </div>

        <h2 className="tickets-heading">Tickets</h2>

        {MOCK_TICKETS.map(({ id, name, desc, price, features }) => (
          <div key={id} className="ticket-card">
            <div className="ticket-header">
              <div>
                <p className="ticket-name">{name}</p>
                <p className="ticket-desc">{desc}</p>
              </div>
              <div className="ticket-price-col">
                <span className={`ticket-price${price === null ? ' free' : ''}`}>
                  {price === null ? 'Free' : `€${price}`}
                </span>
                <InfoCircleIcon size={16} color="#0a84ff" />
              </div>
            </div>
            {features.length > 0 && (
              <div className="ticket-features">
                {features.map(f => (
                  <span key={f} className="ticket-feature">
                    <span className="ticket-feature-check">✓</span>
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="guest-buy-btn" onClick={() => onNavigate('buy-ticket')}>Buy Ticket</button>
    </div>
  )
}

import { ChevronLeftIcon, CalendarIcon, LocationPinIcon, InfoCircleIcon } from '../components/Icons'
import type { Page } from '../App'

type Props = { onBack: () => void; onNavigate: (page: Page) => void }

const TICKETS = [
  {
    id: 'free',
    name: 'Free entrance',
    desc: 'Pay nothing its fun here',
    price: null,
    features: [],
  },
  {
    id: 'general',
    name: 'General Admission',
    desc: 'Access to main demo stage',
    price: 69,
    features: [],
  },
  {
    id: 'vip',
    name: 'VIP Table',
    desc: 'Premium experience',
    price: 420,
    features: ['Drinks & food', 'Best view of stage', 'Massage'],
  },
]

export default function GuestPreview({ onBack, onNavigate }: Props) {
  return (
    <div>
      {/* Hero */}
      <div className="event-hero">
        <button className="topbar-back-btn guest-hero-back" onClick={onBack}>
          <ChevronLeftIcon size={18} color="#fff" />
        </button>
      </div>

      {/* Content */}
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

        {TICKETS.map(({ id, name, desc, price, features }) => (
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

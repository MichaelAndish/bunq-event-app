import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import { SearchIcon, MessageBubbleIcon } from '../components/Icons'
import { api } from '../api/client'
import type { EventTicket } from '../api/client'

type Props = { mock: boolean; eventId?: string | null; onBack: () => void }

type TabKey = 'spend' | 'tickets'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'spend',   label: 'Total Spend' },
  { key: 'tickets', label: 'Tickets' },
]

const AVATAR_COLORS = ['#0a84ff', '#bf5af2', '#ff9500', '#30d158', '#ff453a', '#00c7be', '#ff375f', '#ac8e68']

function initialsOf(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function colorForName(name: string): string {
  let hash = 0
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function fmt(n: number) {
  return `€${n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type CustomerData = {
  name: string
  email: string
  initials: string
  color: string
  tickets: { tierName: string; price: number; purchasedAt: string }[]
  total: number
}

function aggregateCustomers(tickets: EventTicket[]): CustomerData[] {
  const byEmail = new Map<string, CustomerData>()

  for (const t of tickets) {
    if (!byEmail.has(t.buyerEmail)) {
      byEmail.set(t.buyerEmail, {
        name: t.buyerName,
        email: t.buyerEmail,
        initials: initialsOf(t.buyerName),
        color: colorForName(t.buyerName),
        tickets: [],
        total: 0,
      })
    }
    const c = byEmail.get(t.buyerEmail)!
    const price = parseFloat(t.tierPrice)
    c.tickets.push({ tierName: t.tierName, price, purchasedAt: t.purchasedAt })
    c.total += price
  }

  return Array.from(byEmail.values()).sort((a, b) => b.total - a.total)
}

// ── Mock data ──
const MOCK_CUSTOMERS = [
  {
    initials: 'AR', color: '#0a84ff', name: 'Alex Rivera', sub: 'VIP • Table 12',
    tickets: 420, food: 180, drinks: 650, total: 1250, active: '11 PM - 1 AM', ticketName: 'VIP Backstage',
  },
  {
    initials: 'MK', color: '#bf5af2', name: 'Maya Kim', sub: 'VIP • Bottle Service',
    tickets: 320, food: 120, drinks: 540, total: 980, active: '10 PM - 12:30 AM', ticketName: 'General Admission',
  },
  {
    initials: 'JD', color: '#ff9500', name: 'Jordan Davis', sub: 'VIP • Table 07',
    tickets: 280, food: 90, drinks: 450, total: 820, active: '9 PM - 11:30 PM', ticketName: 'Early Bird',
  },
]

export default function CustomerInsights({ mock, eventId, onBack }: Props) {
  const [tab, setTab] = useState<TabKey>('spend')
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mock || !eventId) return
    setLoading(true)
    api.getEventTickets(eventId)
      .then(data => {
        const paid = data.filter(t => t.paymentStatus === 'paid')
        setCustomers(aggregateCustomers(paid))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mock, eventId])

  // No event selected
  if (!mock && !eventId) return (
    <div>
      <PageHeader onBack={onBack} title="Best Customers" />
      <div className="list-card" style={{ margin: '0 20px' }}>
        <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
          <span style={{ padding: '8px 0' }}>Select an event to view customer data.</span>
        </div>
      </div>
    </div>
  )

  // Loading
  if (!mock && loading) return (
    <div>
      <PageHeader onBack={onBack} title="Best Customers" />
      <div className="list-card" style={{ margin: '0 20px' }}>
        <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
          <span style={{ padding: '8px 0' }}>Loading…</span>
        </div>
      </div>
    </div>
  )

  // Real data view
  if (!mock) return (
    <div>
      <PageHeader
        onBack={onBack}
        title="Best Customers"
        right={
          <button className="topbar-icon-btn">
            <SearchIcon size={18} color="#fff" />
          </button>
        }
      />

      <div className="insight-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`insight-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ paddingBottom: 28 }}>
        {customers.length === 0 && (
          <div className="list-card" style={{ margin: '0 20px' }}>
            <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
              <span style={{ padding: '8px 0' }}>No customer data available yet.</span>
            </div>
          </div>
        )}

        {customers.map(c => (
          <div key={c.email} className="insight-card">
            <div className="insight-card-header">
              <div className="spender-avatar" style={{ background: c.color }}>{c.initials}</div>
              <div className="spender-info">
                <p className="spender-name">{c.name}</p>
                <p className="spender-sub">{c.email}</p>
              </div>
              <button className="msg-bubble-btn">
                <MessageBubbleIcon size={15} color="#0a84ff" />
              </button>
            </div>

            {tab === 'spend' && (
              <div className="insight-breakdown">
                {c.tickets.map((t, i) => (
                  <div key={i} className="insight-row">
                    <span className="insight-row-label">{t.tierName}</span>
                    <span className="insight-row-val">{fmt(t.price)}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'tickets' && (
              <div className="insight-breakdown">
                <p className="insight-category-label">TICKETS ({c.tickets.length})</p>
                {c.tickets.map((t, i) => (
                  <div key={i} className="insight-row insight-row-bold">
                    <span className="insight-row-val-left">{t.tierName}</span>
                    <span className="insight-row-val">{fmt(t.price)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="insight-separator" />

            <div className="insight-total-row">
              <span className="insight-total-label">Total Spent</span>
              <span className="insight-total-val">{fmt(c.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Mock view
  return (
    <div>
      <PageHeader
        onBack={onBack}
        title="Best Customers"
        right={
          <button className="topbar-icon-btn">
            <SearchIcon size={18} color="#fff" />
          </button>
        }
      />

      <div className="insight-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`insight-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ paddingBottom: 28 }}>
        {MOCK_CUSTOMERS.map(c => (
          <div key={c.initials} className="insight-card">
            <div className="insight-card-header">
              <div className="spender-avatar" style={{ background: c.color }}>{c.initials}</div>
              <div className="spender-info">
                <p className="spender-name">{c.name}</p>
                <p className="spender-sub">{c.sub}</p>
              </div>
              <button className="msg-bubble-btn">
                <MessageBubbleIcon size={15} color="#0a84ff" />
              </button>
            </div>

            {tab === 'spend' && (
              <div className="insight-breakdown">
                <div className="insight-row">
                  <span className="insight-row-label">Tickets</span>
                  <span className="insight-row-val">{fmt(c.tickets)}</span>
                </div>
                <div className="insight-row">
                  <span className="insight-row-label">Food</span>
                  <span className="insight-row-val">{fmt(c.food)}</span>
                </div>
                <div className="insight-row">
                  <span className="insight-row-label">Drinks</span>
                  <span className="insight-row-val">{fmt(c.drinks)}</span>
                </div>
              </div>
            )}

            {tab === 'tickets' && (
              <div className="insight-breakdown">
                <p className="insight-category-label">TICKET</p>
                <div className="insight-row insight-row-bold">
                  <span className="insight-row-val-left">{c.ticketName}</span>
                  <span className="insight-row-val">{fmt(c.tickets)}</span>
                </div>
              </div>
            )}

            <div className="insight-separator" />

            <div className="insight-total-row">
              <span className="insight-total-label">Total Spent</span>
              <span className="insight-total-val">{fmt(c.total)}</span>
            </div>

            <p className="insight-active">Most active: {c.active}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

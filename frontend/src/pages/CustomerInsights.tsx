import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { SearchIcon, MessageBubbleIcon } from '../components/Icons'

type Props = { mock: boolean; onBack: () => void }

type TabKey = 'spend' | 'tickets' | 'food' | 'drinks'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'spend',   label: 'Total Spend' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'food',    label: 'Food' },
  { key: 'drinks',  label: 'Drinks' },
]

const CUSTOMERS = [
  {
    initials: 'AR',
    color: '#0a84ff',
    name: 'Alex Rivera',
    sub: 'VIP • Table 12',
    tickets: 420,
    food: 180,
    drinks: 650,
    total: 1250,
    active: '11 PM - 1 AM',
    ticketName: 'VIP Backstage',
  },
  {
    initials: 'MK',
    color: '#bf5af2',
    name: 'Maya Kim',
    sub: 'VIP • Bottle Service',
    tickets: 320,
    food: 120,
    drinks: 540,
    total: 980,
    active: '10 PM - 12:30 AM',
    ticketName: 'General Admission',
  },
  {
    initials: 'JD',
    color: '#ff9500',
    name: 'Jordan Davis',
    sub: 'VIP • Table 07',
    tickets: 280,
    food: 90,
    drinks: 450,
    total: 820,
    active: '9 PM - 11:30 PM',
    ticketName: 'Early Bird',
  },
]

function fmt(n: number) {
  return `€${n.toLocaleString('en-IE')}`
}

function CustomerCard({ c, tab }: { c: typeof CUSTOMERS[0]; tab: TabKey }) {
  return (
    <div className="insight-card">
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

      {tab === 'food' && (
        <div className="insight-breakdown">
          <p className="insight-category-label">FOOD</p>
          <div className="insight-row insight-row-bold">
            <span className="insight-row-val-left">Food &amp; Snacks</span>
            <span className="insight-row-val">{fmt(c.food)}</span>
          </div>
        </div>
      )}

      {tab === 'drinks' && (
        <div className="insight-breakdown">
          <p className="insight-category-label">DRINKS</p>
          <div className="insight-row insight-row-bold">
            <span className="insight-row-val-left">Bar &amp; Bottles</span>
            <span className="insight-row-val">{fmt(c.drinks)}</span>
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
  )
}

export default function CustomerInsights({ mock, onBack }: Props) {
  const [tab, setTab] = useState<TabKey>('spend')

  if (!mock) return (
    <div>
      <PageHeader onBack={onBack} title="Best Customers" />
      <div className="list-card" style={{ margin: '0 20px' }}>
        <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
          <span style={{ padding: '8px 0' }}>No customer data available yet.</span>
        </div>
      </div>
    </div>
  )

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
        {CUSTOMERS.map(c => (
          <CustomerCard key={c.initials} c={c} tab={tab} />
        ))}
      </div>
    </div>
  )
}

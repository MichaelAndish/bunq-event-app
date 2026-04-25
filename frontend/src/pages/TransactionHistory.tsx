import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import { SlidersIcon, SearchIcon, XIcon, TrendUpIcon } from '../components/Icons'
import { api } from '../api/client'
import type { EventTicket } from '../api/client'

type Props = { mock: boolean; eventId?: string | null; onBack: () => void }

type Tx = {
  initials: string
  color: string
  name: string
  desc: string
  time: string
  amount: string
}

type Group = { label: string; timestamp: string; txs: Tx[] }

const MOCK_GROUPS: Group[] = [
  {
    label: 'LATEST',
    timestamp: '2 min ago',
    txs: [
      { initials: 'AL', color: '#0a84ff',  name: 'Alex Rivera',  desc: 'Bottle Service - Belvedere', time: '01:42 AM', amount: '€1,250' },
      { initials: 'MK', color: '#bf5af2',  name: 'Maya Kim',     desc: '2x Gin Tonic',              time: '01:38 AM', amount: '€24' },
      { initials: 'JD', color: '#ff9500',  name: 'Jordan Davis', desc: 'VIP Ticket Upgrade',        time: '01:27 AM', amount: '€120' },
    ],
  },
  {
    label: '1 HOUR AGO',
    timestamp: '12:41 AM',
    txs: [
      { initials: 'AL', color: '#0a84ff',  name: 'Alex Rivera', desc: '4x Red Bull',  time: '12:41 AM', amount: '€32' },
      { initials: 'MK', color: '#bf5af2',  name: 'Maya Kim',    desc: '2x Water',     time: '12:36 AM', amount: '€10' },
    ],
  },
  {
    label: '2 HOURS AGO',
    timestamp: '11:58 PM',
    txs: [
      { initials: 'JD', color: '#ff9500',  name: 'Jordan Davis',  desc: 'Bottle Service - Moët',    time: '11:58 PM', amount: '€980' },
      { initials: 'AL', color: '#0a84ff',  name: 'Alex Rivera',   desc: '2x Espresso Martini',      time: '11:52 PM', amount: '€38' },
    ],
  },
]

const AVATAR_COLORS = ['#0a84ff', '#bf5af2', '#ff9500', '#30d158', '#ff453a', '#00c7be', '#ff375f', '#ac8e68']

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function colorForName(name: string): string {
  let hash = 0
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ticketsToGroups(tickets: EventTicket[]): Group[] {
  const byDate = new Map<string, EventTicket[]>()
  for (const t of tickets) {
    const key = formatDate(t.purchasedAt)
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(t)
  }

  return Array.from(byDate.entries()).map(([date, txs]) => ({
    label: date.toUpperCase(),
    timestamp: formatTime(txs[0].purchasedAt),
    txs: txs.map(t => ({
      initials: initials(t.buyerName),
      color: colorForName(t.buyerName),
      name: t.buyerName,
      desc: t.tierName,
      time: formatTime(t.purchasedAt),
      amount: `€${parseFloat(t.tierPrice).toFixed(2)}`,
    })),
  }))
}

export default function TransactionHistory({ mock, eventId, onBack }: Props) {
  const [query, setQuery] = useState('')
  const [tickets, setTickets] = useState<EventTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [totalRevenue, setTotalRevenue] = useState(0)

  useEffect(() => {
    if (mock || !eventId) return
    setLoading(true)
    api.getEventTickets(eventId)
      .then(data => {
        const paid = data.filter(t => t.paymentStatus === 'paid')
        setTickets(paid)
        setTotalRevenue(paid.reduce((sum, t) => sum + parseFloat(t.tierPrice), 0))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mock, eventId])

  // Non-mock with no eventId
  if (!mock && !eventId) return (
    <div>
      <PageHeader onBack={onBack} title="Transactions" />
      <div className="list-card" style={{ margin: '0 20px' }}>
        <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
          <span style={{ padding: '8px 0' }}>Select an event to view transactions.</span>
        </div>
      </div>
    </div>
  )

  // Non-mock — loading
  if (!mock && loading) return (
    <div>
      <PageHeader onBack={onBack} title="Transactions" />
      <div className="list-card" style={{ margin: '0 20px' }}>
        <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
          <span style={{ padding: '8px 0' }}>Loading…</span>
        </div>
      </div>
    </div>
  )

  // Real data view
  if (!mock) {
    const groups = ticketsToGroups(tickets)
    const filtered = query.trim()
      ? groups.map(g => ({
          ...g,
          txs: g.txs.filter(
            t =>
              t.name.toLowerCase().includes(query.toLowerCase()) ||
              t.desc.toLowerCase().includes(query.toLowerCase())
          ),
        })).filter(g => g.txs.length > 0)
      : groups

    return (
      <div>
        <PageHeader
          onBack={onBack}
          title="Transactions"
          right={
            <button className="topbar-icon-btn">
              <SlidersIcon size={18} color="#fff" />
            </button>
          }
        />

        {/* Revenue summary */}
        <div className="form-card tx-summary-card">
          <div className="analytics-card-row">
            <span className="analytics-card-title">Total revenue</span>
          </div>
          <div className="big-number">€{totalRevenue.toLocaleString('en', { minimumFractionDigits: 2 })}</div>
          <div className="stat-meta-row">
            <span>{tickets.length} tickets sold</span>
          </div>
        </div>

        {/* Search */}
        <div className="tx-search-wrap">
          <SearchIcon size={16} color="#8e8e93" />
          <input
            className="tx-search-input"
            placeholder="Search transactions, guests…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="tx-search-clear" onClick={() => setQuery('')}>
              <XIcon size={14} color="#8e8e93" />
            </button>
          )}
        </div>

        {/* Transaction groups */}
        <div style={{ paddingBottom: 28 }}>
          {filtered.length === 0 && (
            <div className="list-card" style={{ margin: '0 20px' }}>
              <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
                <span style={{ padding: '8px 0' }}>No transactions yet.</span>
              </div>
            </div>
          )}
          {filtered.map(group => (
            <div key={group.label} className="tx-group">
              <div className="tx-group-header">
                <span className="tx-group-label">{group.label}</span>
                <span className="tx-group-time">{group.timestamp}</span>
              </div>
              <div className="tx-group-card">
                {group.txs.map((tx, i) => (
                  <div key={i}>
                    {i > 0 && <div className="list-separator" style={{ margin: '0 0 0 62px' }} />}
                    <div className="tx-row">
                      <div className="spender-avatar" style={{ background: tx.color, width: 38, height: 38, fontSize: 12 }}>
                        {tx.initials}
                      </div>
                      <div className="tx-info">
                        <p className="tx-name">{tx.name}</p>
                        <p className="tx-desc">{tx.desc}</p>
                      </div>
                      <div className="tx-right">
                        <p className="tx-time">{tx.time}</p>
                        <p className="tx-amount">{tx.amount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Mock view
  const filtered = query.trim()
    ? MOCK_GROUPS.map(g => ({
        ...g,
        txs: g.txs.filter(
          t =>
            t.name.toLowerCase().includes(query.toLowerCase()) ||
            t.desc.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter(g => g.txs.length > 0)
    : MOCK_GROUPS

  return (
    <div>
      <PageHeader
        onBack={onBack}
        title="Recent Transactions"
        right={
          <button className="topbar-icon-btn">
            <SlidersIcon size={18} color="#fff" />
          </button>
        }
      />

      {/* Revenue summary */}
      <div className="form-card tx-summary-card">
        <div className="analytics-card-row">
          <span className="analytics-card-title">Total money received</span>
          <span className="trend-badge">
            <TrendUpIcon size={12} color="#30d158" />
            +12%
          </span>
        </div>
        <div className="big-number">€124,500</div>
        <div className="stat-meta-row">
          <span>Avg. spend: €62 / guest</span>
          <span>2,000+ tickets</span>
        </div>
      </div>

      {/* Search */}
      <div className="tx-search-wrap">
        <SearchIcon size={16} color="#8e8e93" />
        <input
          className="tx-search-input"
          placeholder="Search transactions, guests, items..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button className="tx-search-clear" onClick={() => setQuery('')}>
            <XIcon size={14} color="#8e8e93" />
          </button>
        )}
      </div>

      {/* Transaction groups */}
      <div style={{ paddingBottom: 28 }}>
        {filtered.map(group => (
          <div key={group.label} className="tx-group">
            <div className="tx-group-header">
              <span className="tx-group-label">{group.label}</span>
              <span className="tx-group-time">{group.timestamp}</span>
            </div>
            <div className="tx-group-card">
              {group.txs.map((tx, i) => (
                <div key={i}>
                  {i > 0 && <div className="list-separator" style={{ margin: '0 0 0 62px' }} />}
                  <div className="tx-row">
                    <div className="spender-avatar" style={{ background: tx.color, width: 38, height: 38, fontSize: 12 }}>
                      {tx.initials}
                    </div>
                    <div className="tx-info">
                      <p className="tx-name">{tx.name}</p>
                      <p className="tx-desc">{tx.desc}</p>
                    </div>
                    <div className="tx-right">
                      <p className="tx-time">{tx.time}</p>
                      <p className="tx-amount">{tx.amount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

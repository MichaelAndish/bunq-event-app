import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { SlidersIcon, SearchIcon, XIcon, TrendUpIcon } from '../components/Icons'

type Props = { onBack: () => void }

type Tx = {
  initials: string
  color: string
  name: string
  desc: string
  time: string
  amount: string
}

type Group = { label: string; timestamp: string; txs: Tx[] }

const GROUPS: Group[] = [
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

export default function TransactionHistory({ onBack }: Props) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? GROUPS.map(g => ({
        ...g,
        txs: g.txs.filter(
          t =>
            t.name.toLowerCase().includes(query.toLowerCase()) ||
            t.desc.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter(g => g.txs.length > 0)
    : GROUPS

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

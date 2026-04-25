import TopBar from '../components/TopBar'
import { TrendUpIcon, MailIcon, ChevronRightIcon, UsersIcon, ReceiptIcon } from '../components/Icons'
import type { Page } from '../App'

type Props = { onBack: () => void; onNavigate: (page: Page) => void }

// ── Line Chart ────────────────────────────────────────
// Points trace Fri→Sat→Sun revenue, rising steeply toward Sun
const LINE_PTS = [
  [0, 52], [30, 58], [65, 50], [105, 42], [145, 50],
  [185, 36], [225, 22], [265, 12], [300, 6],
]

function LineChart() {
  const pts = LINE_PTS.map(([x, y]) => `${x},${y}`).join(' ')
  const area = `M${LINE_PTS[0][0]},${LINE_PTS[0][1]} ` +
    LINE_PTS.slice(1).map(([x, y]) => `L${x},${y}`).join(' ') +
    ` L300,70 L0,70 Z`

  return (
    <svg
      viewBox="0 0 300 70"
      width="100%"
      height="80"
      preserveAspectRatio="none"
      aria-label="Revenue trend chart"
    >
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a84ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0a84ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lg)" />
      <polyline
        points={pts}
        fill="none"
        stroke="#0a84ff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Bar Chart ─────────────────────────────────────────
const HOURS = ['22', '23', '00', '01', '02', '03']
const BAR_H = [28, 42, 58, 76, 50, 34]   // heights in px (max 80)
const BAR_W = 30
const BAR_GAP = 14
const CHART_H = 80

function BarChart() {
  return (
    <svg
      viewBox={`0 0 ${HOURS.length * (BAR_W + BAR_GAP) - BAR_GAP} ${CHART_H}`}
      width="100%"
      height="90"
      preserveAspectRatio="none"
      aria-label="Peak spending hours bar chart"
    >
      {HOURS.map((_, i) => {
        const h = BAR_H[i]
        const x = i * (BAR_W + BAR_GAP)
        const y = CHART_H - h
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={BAR_W}
            height={h}
            rx="5"
            fill="#0a84ff"
          />
        )
      })}
    </svg>
  )
}

// ── Top Spenders data ─────────────────────────────────
const SPENDERS = [
  { initials: 'AL', color: '#0a84ff',  name: 'Alex Rivera',  sub: 'VIP Table • €1,250' },
  { initials: 'MK', color: '#bf5af2',  name: 'Maya Kim',     sub: 'Bottle service • €980' },
  { initials: 'JD', color: '#ff9500',  name: 'Jordan Davis', sub: 'VIP Table • €820' },
]

export default function Analytics({ onBack, onNavigate }: Props) {
  return (
    <div>
      <TopBar onBack={onBack} />

      <div className="analytics-header">
        <h1>bunq demo day</h1>
        <p>Analytics &amp; AI recommendations</p>
      </div>

      {/* ── Revenue Card ─────────────────────────────── */}
      <div className="form-card">
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

        <div className="chart-wrap">
          <LineChart />
        </div>

        <div className="x-labels">
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </div>

      {/* ── Top Spenders Card ────────────────────────── */}
      <div className="form-card">
        <div className="analytics-card-row" style={{ marginBottom: 4 }}>
          <span className="analytics-card-title">Top Spenders (VIP)</span>
        </div>

        {SPENDERS.map(({ initials, color, name, sub }, i) => (
          <div key={initials}>
            {i > 0 && <div className="list-separator" style={{ margin: '0' }} />}
            <div className="spender-row">
              <div className="spender-avatar" style={{ background: color }}>
                {initials}
              </div>
              <div className="spender-info">
                <p className="spender-name">{name}</p>
                <p className="spender-sub">{sub}</p>
              </div>
              <ChevronRightIcon size={16} color="#48484a" />
            </div>
          </div>
        ))}

        <button className="discount-btn">
          <MailIcon size={16} color="#fff" />
          Send 15% Discount For Next Event
        </button>
      </div>

      {/* ── Peak Hours Card ──────────────────────────── */}
      <div className="form-card">
        <div className="analytics-card-row">
          <span className="analytics-card-title">Peak Spending Hours</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Last 24h</span>
        </div>

        <div className="chart-wrap">
          <BarChart />
        </div>

        <div className="x-labels">
          {HOURS.map(h => <span key={h}>{h}</span>)}
        </div>

        <p className="peak-label">Peak: 01:00 — highest spend per hour</p>
      </div>

      {/* ── Insights Navigation ───────────────────────── */}
      <div className="form-card">
        <div className="form-card-header">
          <h3 className="form-card-title">Detailed Insights</h3>
        </div>

        <button className="insight-nav-row" onClick={() => onNavigate('customer-insights')}>
          <div className="insight-nav-icon" style={{ background: 'rgba(10,132,255,0.15)' }}>
            <UsersIcon size={18} color="#0a84ff" />
          </div>
          <div className="insight-nav-info">
            <p className="insight-nav-title">Best Customers</p>
            <p className="insight-nav-sub">Spend breakdown per guest</p>
          </div>
          <ChevronRightIcon size={16} color="#48484a" />
        </button>

        <div className="list-separator" style={{ margin: '0' }} />

        <button className="insight-nav-row" onClick={() => onNavigate('transaction-history')}>
          <div className="insight-nav-icon" style={{ background: 'rgba(48,209,88,0.12)' }}>
            <ReceiptIcon size={18} color="#30d158" />
          </div>
          <div className="insight-nav-info">
            <p className="insight-nav-title">Transaction History</p>
            <p className="insight-nav-sub">All payments in real time</p>
          </div>
          <ChevronRightIcon size={16} color="#48484a" />
        </button>
      </div>
    </div>
  )
}

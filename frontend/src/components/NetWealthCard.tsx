import { ArrowUpIcon, ChevronRightIcon } from './Icons'

type Props = {
  balance?: string
  todayDelta?: string
}

function formatEuro(value: string) {
  const n = parseFloat(value)
  if (Number.isNaN(n)) return value
  return `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`
}

export default function NetWealthCard({ balance, todayDelta }: Props) {
  const displayBalance = balance ? formatEuro(balance) : '€ —'
  const displayDelta   = todayDelta && parseFloat(todayDelta) > 0 ? formatEuro(todayDelta) : null

  return (
    <div className="wealth-card">
      <p className="wealth-label">Net Wealth</p>
      <div className="wealth-amount-row">
        <h2 className="wealth-amount">{displayBalance}</h2>
        <ChevronRightIcon size={18} color="#636366" />
      </div>
      {displayDelta && (
        <p className="wealth-today">
          Today{' '}
          <span className="wealth-delta">
            <ArrowUpIcon size={12} color="#30d158" />
            {' '}{displayDelta}
          </span>
        </p>
      )}
    </div>
  )
}

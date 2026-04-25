import { ArrowUpIcon, ChevronRightIcon } from './Icons'

export default function NetWealthCard() {
  return (
    <div className="wealth-card">
      <p className="wealth-label">Net Wealth</p>
      <div className="wealth-amount-row">
        <h2 className="wealth-amount">€ 873.244,98</h2>
        <ChevronRightIcon size={18} color="#636366" />
      </div>
      <p className="wealth-today">
        Today{' '}
        <span className="wealth-delta">
          <ArrowUpIcon size={12} color="#30d158" />
          {' '}€ 39.234,95
        </span>
      </p>
    </div>
  )
}

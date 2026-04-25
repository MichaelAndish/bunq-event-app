import type { ReactNode } from 'react'

type Props = {
  icon: ReactNode
  iconBg: string
  name: string
  subtitle: string
  amount: string
}

export default function TransactionItem({ icon, iconBg, name, subtitle, amount }: Props) {
  return (
    <div className="list-row">
      <span className="list-icon" style={{ background: iconBg }}>
        {icon}
      </span>
      <span className="list-info">
        <span className="list-name">{name}</span>
        <span className="list-subtitle">{subtitle}</span>
      </span>
      <span className="list-amount">{amount}</span>
    </div>
  )
}

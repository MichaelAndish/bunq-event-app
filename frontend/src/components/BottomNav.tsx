import { HomeIcon, CardsIcon, SavingsIcon, StocksIcon, CryptoIcon } from './Icons'
import type { Page } from '../App'

type Props = {
  active: Page
  onChange: (page: Page) => void
  locked?: boolean
}

const NAV: { id: Page; label: string; Icon: React.FC<{ size?: number; color?: string }> }[] = [
  { id: 'home',    label: 'Home',    Icon: HomeIcon },
  { id: 'cards',   label: 'Cards',   Icon: CardsIcon },
  { id: 'savings', label: 'Savings', Icon: SavingsIcon },
  { id: 'stocks',  label: 'Stocks',  Icon: StocksIcon },
  { id: 'crypto',  label: 'Crypto',  Icon: CryptoIcon },
]

export default function BottomNav({ active, onChange, locked = false }: Props) {
  return (
    <nav className="bottom-nav">
      {NAV.map(({ id, label, Icon }) => {
        const isActive   = active === id
        // When locked, all tabs disabled except we show them greyed out
        // Cards/Savings/Stocks/Crypto are also permanently disabled (placeholder pages)
        const isDisabled = locked || id === 'cards' || id === 'savings' || id === 'stocks' || id === 'crypto'
        return (
          <button
            key={id}
            className={`bnav-item${isActive ? ' active' : ''}${isDisabled ? ' disabled' : ''}`}
            onClick={() => !isDisabled && onChange(id)}
            disabled={isDisabled}
            style={locked && !isActive ? { opacity: 0.35 } : undefined}
          >
            <span className="bnav-icon">
              <Icon size={22} color={isActive ? '#0a84ff' : '#8e8e93'} />
            </span>
            <span className="bnav-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

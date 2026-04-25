import { HomeIcon, CardsIcon, SavingsIcon, StocksIcon, CryptoIcon } from './Icons'
import type { Page } from '../App'

type Props = {
  active: Page
  onChange: (page: Page) => void
}

const NAV: { id: Page; label: string; Icon: React.FC<{ size?: number; color?: string }>; disabled?: boolean }[] = [
  { id: 'home',    label: 'Home',    Icon: HomeIcon },
  { id: 'cards',   label: 'Cards',   Icon: CardsIcon,   disabled: true },
  { id: 'savings', label: 'Savings', Icon: SavingsIcon, disabled: true },
  { id: 'stocks',  label: 'Stocks',  Icon: StocksIcon,  disabled: true },
  { id: 'crypto',  label: 'Crypto',  Icon: CryptoIcon,  disabled: true },
]

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav">
      {NAV.map(({ id, label, Icon, disabled }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            className={`bnav-item${isActive ? ' active' : ''}${disabled ? ' disabled' : ''}`}
            onClick={() => !disabled && onChange(id)}
            disabled={disabled}
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

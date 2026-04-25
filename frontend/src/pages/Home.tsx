import TopBar from '../components/TopBar'
import NetWealthCard from '../components/NetWealthCard'
import ActionButton from '../components/ActionButton'
import BankAccounts from '../components/BankAccounts'
import TransactionItem from '../components/TransactionItem'
import { SearchIcon, ExchangeIcon } from '../components/Icons'
import type { Page } from '../App'

type Props = { onNavigate: (page: Page) => void }

export default function Home({ onNavigate }: Props) {
  return (
    <div>
      <TopBar />
      <h1 className="page-title">Home</h1>
      <NetWealthCard />

      <div className="action-grid">
        <ActionButton
          label="Pay"
          borderColor="#ff9500"
          dotStyle={{ background: '#ff9500' }}
          disabled
        />
        <ActionButton
          label="Request"
          borderColor="#0a84ff"
          dotStyle={{ background: '#0a84ff' }}
          disabled
        />
        <ActionButton
          label="Add Money"
          borderColor="#bf5af2"
          dotStyle={{ background: 'linear-gradient(135deg, #bf5af2, #ff375f)' }}
          disabled
        />
        <ActionButton
          label="Events"
          borderColor="#30d158"
          dotStyle={{ background: '#30d158' }}
          dotContent={<span style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1 }}>+</span>}
          onClick={() => onNavigate('events')}
        />
      </div>

      <BankAccounts />

      <div className="section-header">
        <h2 className="section-title">Recent Transactions</h2>
        <button className="section-icon-btn">
          <SearchIcon size={20} color="#8e8e93" />
        </button>
      </div>
      <div className="list-card">
        <TransactionItem
          iconBg="linear-gradient(135deg, #ff9500, #ff6b00)"
          icon={<ExchangeIcon size={20} color="#fff" />}
          name="Bunny Go"
          subtitle="Payment received"
          amount="€ 100,00"
        />
      </div>
    </div>
  )
}

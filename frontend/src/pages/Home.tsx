import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar'
import NetWealthCard from '../components/NetWealthCard'
import ActionButton from '../components/ActionButton'
import BankAccounts from '../components/BankAccounts'
import TransactionItem from '../components/TransactionItem'
import { SearchIcon } from '../components/Icons'
import { api } from '../api/client'
import type { Transaction } from '../api/client'
import type { Page, ApiStatus } from '../App'

type Props = { mock: boolean; apiStatus: ApiStatus; onNavigate: (page: Page) => void }

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', amount: '69.00',  currency: 'EUR', description: 'General Admission – Neon Nights', counterparty: 'Alex Rivera',  createdAt: '' },
  { id: '2', amount: '420.00', currency: 'EUR', description: 'VIP Table – Neon Nights',         counterparty: 'Maya Kim',     createdAt: '' },
  { id: '3', amount: '69.00',  currency: 'EUR', description: 'General Admission – Neon Nights', counterparty: 'Jordan Davis', createdAt: '' },
]

const AVATAR_COLORS = ['#0a84ff', '#bf5af2', '#ff9500', '#30d158', '#ff375f', '#5e5ce6']

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatAmount(amount: string, currency: string) {
  return `${currency === 'EUR' ? '€' : currency} ${amount}`
}

function todayTotal(txs: Transaction[]): string {
  const today = new Date().toISOString().slice(0, 10)
  const sum = txs
    .filter(tx => tx.createdAt.slice(0, 10) === today)
    .reduce((acc, tx) => acc + parseFloat(tx.amount), 0)
  return sum > 0 ? sum.toFixed(2) : ''
}

export default function Home({ mock, apiStatus, onNavigate }: Props) {
  const [displayName,   setDisplayName]   = useState('')
  const [userId,        setUserId]        = useState('')
  const [accountId,     setAccountId]     = useState('')
  const [accountName,   setAccountName]   = useState('')
  const [balance,       setBalance]       = useState('')
  const [transactions,  setTransactions]  = useState<Transaction[]>([])

  // Fetch user / account data once we know the API is online
  useEffect(() => {
    if (apiStatus !== 'online' || mock) return
    api.clientStatus()
      .then(s => {
        setDisplayName(s.displayName ?? '')
        if (s.userId && s.accountId) {
          setUserId(s.userId)
          setAccountId(s.accountId)
        }
      })
      .catch(() => {})
  }, [apiStatus, mock])

  useEffect(() => {
    if (!userId || !accountId) return
    api.clientBalance(userId, accountId)
      .then(b => {
        setBalance(b.balance)
        setAccountName(b.name)
        if (b.displayName) setDisplayName(b.displayName)
      })
      .catch(() => {})
    api.clientTransactions(userId, accountId, 7)
      .then(setTransactions)
      .catch(() => {})
  }, [userId, accountId])

  const displayTransactions = mock ? MOCK_TRANSACTIONS : transactions

  return (
    <div>
      <TopBar name={displayName || undefined} />
      <h1 className="page-title">Home</h1>

      <NetWealthCard
        balance={mock ? '383000.00' : balance || undefined}
        todayDelta={mock ? '39234.95' : todayTotal(transactions) || undefined}
      />

      <div className="action-grid">
        <ActionButton label="Pay"       borderColor="#ff9500" dotStyle={{ background: '#ff9500' }} disabled />
        <ActionButton label="Request"   borderColor="#0a84ff" dotStyle={{ background: '#0a84ff' }} disabled />
        <ActionButton label="Add Money" borderColor="#bf5af2" dotStyle={{ background: 'linear-gradient(135deg, #bf5af2, #ff375f)' }} disabled />
        <ActionButton
          label="Events"
          borderColor="#30d158"
          dotStyle={{ background: '#30d158' }}
          dotContent={<span style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1 }}>+</span>}
          onClick={() => onNavigate('events')}
          disabled={apiStatus !== 'online'}
        />
      </div>

      <BankAccounts
        mock={mock}
        name={accountName || undefined}
        balance={balance || undefined}
      />

      <div className="section-header">
        <h2 className="section-title">Recent Transactions</h2>
        <button className="section-icon-btn">
          <SearchIcon size={20} color="#8e8e93" />
        </button>
      </div>
      <div className="list-card">
        {displayTransactions.length > 0 ? (
          displayTransactions.map((tx, i) => (
            <div key={tx.id}>
              {i > 0 && <div className="list-separator" />}
              <TransactionItem
                iconBg={avatarColor(tx.counterparty)}
                icon={<span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{initials(tx.counterparty)}</span>}
                name={tx.counterparty}
                subtitle={tx.description}
                amount={formatAmount(tx.amount, tx.currency)}
              />
            </div>
          ))
        ) : (
          <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
            <span style={{ padding: '8px 0' }}>
              {apiStatus === 'offline' ? 'Backend offline — no data available' : 'No transactions yet'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

import { WalletIcon, HouseSmallIcon } from './Icons'

type Props = {
  mock?: boolean
  name?: string
  balance?: string
}

const MOCK_ACCOUNTS = [
  { id: 'big-money',    name: 'Big Money',    balance: '€ 383.000,00', iconBg: 'linear-gradient(135deg, #5e5ce6, #0a84ff)', Icon: WalletIcon },
  { id: 'bigger-money', name: 'Bigger Money', balance: '€ 300,00',     iconBg: 'linear-gradient(135deg, #30d158, #00c7be)', Icon: HouseSmallIcon },
]

function formatBalance(value: string) {
  const n = parseFloat(value)
  if (Number.isNaN(n)) return value
  return `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`
}

export default function BankAccounts({ mock, name, balance }: Props) {
  if (mock) {
    return (
      <section>
        <h2 className="section-title">Bank Accounts</h2>
        <div className="list-card">
          {MOCK_ACCOUNTS.map(({ id, name, balance, iconBg, Icon }, i) => (
            <div key={id}>
              {i > 0 && <div className="list-separator" />}
              <div className="list-row">
                <span className="list-icon" style={{ background: iconBg }}><Icon size={20} color="#fff" /></span>
                <span className="list-name">{name}</span>
                <span className="list-amount">{balance}</span>
              </div>
            </div>
          ))}
          <div className="list-separator" />
          <button className="list-add-link">Add an Extra Bank Account</button>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="section-title">Bank Accounts</h2>
      <div className="list-card">
        {name && balance ? (
          <div className="list-row">
            <span className="list-icon" style={{ background: 'linear-gradient(135deg, #5e5ce6, #0a84ff)' }}>
              <WalletIcon size={20} color="#fff" />
            </span>
            <span className="list-name">{name}</span>
            <span className="list-amount">{formatBalance(balance)}</span>
          </div>
        ) : (
          <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
            <span style={{ padding: '8px 0' }}>No account data available</span>
          </div>
        )}
        <div className="list-separator" />
        <button className="list-add-link">Add an Extra Bank Account</button>
      </div>
    </section>
  )
}

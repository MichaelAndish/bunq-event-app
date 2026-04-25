import { WalletIcon, HouseSmallIcon } from './Icons'

const ACCOUNTS = [
  {
    id: 'big-money',
    name: 'Big Money',
    balance: '€ 383,000',
    iconBg: 'linear-gradient(135deg, #5e5ce6, #0a84ff)',
    Icon: WalletIcon,
  },
  {
    id: 'bigger-money',
    name: 'Bigger Money',
    balance: '€ 300',
    iconBg: 'linear-gradient(135deg, #30d158, #00c7be)',
    Icon: HouseSmallIcon,
  },
]

export default function BankAccounts() {
  return (
    <section>
      <h2 className="section-title">Bank Accounts</h2>
      <div className="list-card">
        {ACCOUNTS.map(({ id, name, balance, iconBg, Icon }, i) => (
          <div key={id}>
            {i > 0 && <div className="list-separator" />}
            <div className="list-row">
              <span className="list-icon" style={{ background: iconBg }}>
                <Icon size={20} color="#fff" />
              </span>
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

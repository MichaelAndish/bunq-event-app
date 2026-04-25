import { useState, useEffect } from 'react'
import { XIcon } from './Icons'

const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
]

function parsePrice(raw: string): { currency: string; amount: string } {
  for (const c of CURRENCIES) {
    if (raw.startsWith(c.symbol)) {
      const numeric = raw.slice(c.symbol.length).replace(/,/g, '')
      return { currency: c.code, amount: numeric }
    }
  }
  return { currency: 'EUR', amount: raw.replace(/[^0-9.]/g, '') }
}

type Props = {
  initial?: { name: string; price: string }
  onSave: (name: string, price: string) => void
  onClose: () => void
}

export default function TierSheet({ initial, onSave, onClose }: Props) {
  const parsed = initial ? parsePrice(initial.price) : { currency: 'EUR', amount: '' }

  const [name,     setName]     = useState(initial?.name ?? '')
  const [currency, setCurrency] = useState(parsed.currency)
  const [amount,   setAmount]   = useState(parsed.amount)
  const [touched,  setTouched]  = useState(false)

  useEffect(() => {
    const p = initial ? parsePrice(initial.price) : { currency: 'EUR', amount: '' }
    setName(initial?.name ?? '')
    setCurrency(p.currency)
    setAmount(p.amount)
    setTouched(false)
  }, [initial?.name, initial?.price])

  const amountNum   = parseFloat(amount)
  const priceValid  = amount !== '' && !isNaN(amountNum) && amountNum > 0
  const nameValid   = name.trim().length > 0
  const valid       = nameValid && priceValid
  const priceError  = touched && amount !== '' && !priceValid

  const symbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '€'

  const handleSave = () => {
    setTouched(true)
    if (!valid) return
    const formatted = `${symbol}${amountNum.toFixed(2)}`
    onSave(name.trim(), formatted)
  }

  return (
    <div className="tier-sheet-backdrop" onClick={onClose}>
      <div className="tier-sheet" onClick={e => e.stopPropagation()}>

        <div className="tier-sheet-header">
          <span className="tier-sheet-title">{initial ? 'Edit Tier' : 'Add Tier'}</span>
          <button className="tier-sheet-close" onClick={onClose}>
            <XIcon size={14} color="#8e8e93" />
          </button>
        </div>

        <div className="tier-sheet-body">
          {/* Tier name */}
          <div className="tier-sheet-field">
            <label className="tier-sheet-label">Tier name</label>
            <input
              className={`tier-sheet-input${touched && !nameValid ? ' tier-sheet-input--error' : ''}`}
              placeholder="e.g. General Admission"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            {touched && !nameValid && (
              <span className="tier-sheet-error">Tier name is required</span>
            )}
          </div>

          {/* Currency — separate field */}
          <div className="tier-sheet-field">
            <label className="tier-sheet-label">Currency</label>
            <select
              className="tier-sheet-select"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Price — number only */}
          <div className="tier-sheet-field">
            <label className="tier-sheet-label">Unit price</label>
            <div className={`tier-sheet-price-wrap${priceError ? ' tier-sheet-price-wrap--error' : ''}`}>
              <span className="tier-sheet-symbol">{symbol}</span>
              <input
                className="tier-sheet-price-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => { setTouched(true); setAmount(e.target.value) }}
                onBlur={() => setTouched(true)}
              />
            </div>
            {priceError && (
              <span className="tier-sheet-error">Enter a valid price greater than 0</span>
            )}
          </div>
        </div>

        <div className="tier-sheet-actions">
          <button className="tier-sheet-cancel" onClick={onClose}>Cancel</button>
          <button className="tier-sheet-save" onClick={handleSave} disabled={touched && !valid}>
            {initial ? 'Save changes' : 'Add tier'}
          </button>
        </div>

      </div>
    </div>
  )
}

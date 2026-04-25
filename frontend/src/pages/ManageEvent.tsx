import { useState } from 'react'
import TopBar from '../components/TopBar'
import TierSheet from '../components/TierSheet'
import { EditImageIcon, PencilIcon, TrashIcon, PlusIcon } from '../components/Icons'
import type { Page } from '../App'

type Props = { onBack: () => void; onNavigate: (page: Page) => void }

type Tier = { id: string; name: string; price: string }

const INITIAL_TIERS: Tier[] = [
  { id: 'early-bird', name: 'Early Bird',        price: '€25.00' },
  { id: 'general',    name: 'General Admission', price: '€35.00' },
]

export default function ManageEvent({ onBack, onNavigate }: Props) {
  const [tiers,       setTiers]       = useState<Tier[]>(INITIAL_TIERS)
  const [sheetOpen,   setSheetOpen]   = useState(false)
  const [editingTier, setEditingTier] = useState<Tier | null>(null)
  const [name,        setName]        = useState('bunq demo day')
  const [date,        setDate]        = useState('Sat, 25 Apr • 14:00')
  const [location,    setLocation]    = useState('bunq HQ')

  const openAdd  = () => { setEditingTier(null); setSheetOpen(true) }
  const openEdit = (tier: Tier) => { setEditingTier(tier); setSheetOpen(true) }
  const closeSheet = () => { setSheetOpen(false); setEditingTier(null) }

  const handleSave = (name: string, price: string) => {
    if (editingTier) {
      setTiers(ts => ts.map(t => t.id === editingTier.id ? { ...t, name, price } : t))
    } else {
      setTiers(ts => [...ts, { id: `tier-${Date.now()}`, name, price }])
    }
    closeSheet()
  }

  const deleteTier = (id: string) => setTiers(ts => ts.filter(t => t.id !== id))

  return (
    <div>
      <TopBar onBack={onBack} />

      {/* Hero */}
      <div className="event-hero">
        <button className="edit-image-btn">
          <EditImageIcon size={16} color="#fff" />
          Edit image
        </button>
      </div>

      <div className="manage-heading">
        <h1>Manage Event</h1>
        <p>Edit details, ticket tiers, and description.</p>
      </div>

      {/* Event Details */}
      <div className="form-card">
        <div className="form-card-header">
          <h3 className="form-card-title">Event Details</h3>
        </div>
        <div className="field-group">
          <label className="field-label">Event name</label>
          <input className="field-input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Date</label>
          <input className="field-input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Location</label>
          <input className="field-input" value={location} onChange={e => setLocation(e.target.value)} />
        </div>
      </div>

      {/* Ticket Tiers */}
      <div className="form-card">
        <div className="form-card-header">
          <h3 className="form-card-title">Ticket Tiers</h3>
          <button className="section-header-btn" onClick={openAdd}>
            <PlusIcon size={14} color="#fff" />
            Add tier
          </button>
        </div>

        {tiers.map(({ id, name, price }, i) => (
          <div key={id}>
            {i > 0 && <div className="list-separator" style={{ margin: '0' }} />}
            <div className="tier-edit-row">
              <div className="tier-edit-info">
                <p className="tier-edit-name">{name}</p>
                <p className="tier-edit-price">{price}</p>
              </div>
              <div className="tier-actions">
                <button className="tier-action-btn" onClick={() => openEdit({ id, name, price })}>
                  <PencilIcon size={15} color="#8e8e93" />
                </button>
                <button className="tier-action-btn" onClick={() => deleteTier(id)}>
                  <TrashIcon size={15} color="#ff453a" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {tiers.length === 0 && (
          <p className="tier-empty-hint">No tiers yet. Add one above.</p>
        )}
      </div>

      {/* Description */}
      <div className="form-card">
        <div className="form-card-header">
          <h3 className="form-card-title">Description</h3>
        </div>
        <textarea
          className="description-textarea"
          placeholder="Add more details about the event, schedule, and what guests can expect..."
        />
      </div>

      {/* Actions */}
      <div className="btn-stack">
        <button className="btn-stack-primary">Save Changes</button>
        <button className="btn-stack-secondary" onClick={() => onNavigate('analytics')}>View Analytics</button>
      </div>

      {sheetOpen && (
        <TierSheet
          initial={editingTier ?? undefined}
          onSave={handleSave}
          onClose={closeSheet}
        />
      )}
    </div>
  )
}

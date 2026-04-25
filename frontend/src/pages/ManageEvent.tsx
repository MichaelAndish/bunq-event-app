import { useState, useEffect } from 'react'
import TopBar from '../components/TopBar'
import TierSheet from '../components/TierSheet'
import SubmitButton from '../components/SubmitButton'
import { EditImageIcon, PencilIcon, TrashIcon, PlusIcon } from '../components/Icons'
import { api } from '../api/client'
import type { Page } from '../App'

type Props = { mock: boolean; eventId?: string | null; onBack: () => void; onNavigate: (page: Page) => void }

type Tier = { id: string; name: string; price: string }

const MOCK_TIERS: Tier[] = [
  { id: 'early-bird', name: 'Early Bird',        price: '€25.00' },
  { id: 'general',    name: 'General Admission', price: '€35.00' },
]

export default function ManageEvent({ mock, eventId, onBack, onNavigate }: Props) {
  const [tiers,       setTiers]       = useState<Tier[]>(mock ? MOCK_TIERS : [])
  const [sheetOpen,   setSheetOpen]   = useState(false)
  const [editingTier, setEditingTier] = useState<Tier | null>(null)
  const [name,        setName]        = useState(mock ? 'bunq demo day'       : '')
  const [date,        setDate]        = useState(mock ? 'Sat, 25 Apr • 14:00' : '')
  const [location,    setLocation]    = useState(mock ? 'bunq HQ'             : '')
  const [description, setDescription] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState('')

  useEffect(() => {
    if (mock || !eventId) return
    setLoading(true)
    api.getEvent(eventId)
      .then(e => {
        setName(e.name)
        setDate(e.date)
        setLocation(e.location)
        setDescription(e.description ?? '')
        setTiers(e.tiers.map(t => ({
          id:    t.id,
          name:  t.name,
          price: `€${parseFloat(t.price).toFixed(2)}`,
        })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mock, eventId])

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

  const handleSaveChanges = async () => {
    if (mock || !eventId) return
    setSaving(true)
    setSaveError('')
    try {
      await api.updateEvent(eventId, {
        name,
        date,
        location,
        description,
        ticketTiers: tiers.map(({ name, price }) => ({ name, price, currency: 'EUR' as const })),
      })
    } catch {
      setSaveError('Could not save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!mock && !eventId) return (
    <div>
      <TopBar onBack={onBack} />
      <h1 className="page-title">Manage Event</h1>
      <div className="list-card" style={{ margin: '0 20px' }}>
        <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
          <span style={{ padding: '8px 0' }}>Select an event from Your Events to manage it.</span>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <TopBar onBack={onBack} />

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

      {loading ? (
        <div className="list-card" style={{ margin: '0 20px' }}>
          <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
            <span style={{ padding: '8px 0' }}>Loading event…</span>
          </div>
        </div>
      ) : (
        <>
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

          <div className="form-card">
            <div className="form-card-header">
              <h3 className="form-card-title">Description</h3>
            </div>
            <textarea
              className="description-textarea"
              placeholder="Add more details about the event…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {saveError && (
            <p style={{ color: '#ff453a', fontSize: 13, textAlign: 'center', margin: '0 20px 8px' }}>{saveError}</p>
          )}
          <div className="btn-stack">
            <SubmitButton label={saving ? 'Saving…' : 'Save Changes'} onClick={handleSaveChanges} disabled={saving || mock} />
            <button className="btn-stack-secondary" onClick={() => onNavigate('analytics')}>View Analytics</button>
          </div>
        </>
      )}

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

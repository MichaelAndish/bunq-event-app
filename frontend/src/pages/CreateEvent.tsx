import { useState, useEffect, useRef } from 'react'
import TopBar from '../components/TopBar'
import FormCard from '../components/FormCard'
import FormField from '../components/FormField'
import ToggleSwitch from '../components/ToggleSwitch'
import SubmitButton from '../components/SubmitButton'
import TierSheet from '../components/TierSheet'
import { CalendarIcon, LocationPinIcon, ChevronRightIcon, EditImageIcon, CameraIcon, PlusIcon } from '../components/Icons'
import { api } from '../api/client'
import type { Page, EventDraft } from '../App'

type Tier = { id: string; name: string; subtitle: string; price: string }

const DEFAULT_TIERS: Tier[] = [
  { id: 'general', name: 'General Admission', subtitle: 'Standard entry',                  price: '€25.00' },
  { id: 'vip',     name: 'VIP Table',         subtitle: 'Bottle service + priority entry', price: '€1000.00' },
]

type Props = { onBack: () => void; onNavigate: (page: Page) => void; draft?: EventDraft | null; aiWarning?: boolean; onEventCreated?: (id: string) => void }

export default function CreateEvent({ onBack, onNavigate, draft, aiWarning, onEventCreated }: Props) {
  const [vipAnalytics, setVipAnalytics] = useState(true)
  const [eventName, setEventName]       = useState(draft?.name ?? '')
  const [date, setDate]                 = useState(draft?.date ?? '')
  const [location, setLocation]         = useState(draft?.location ?? '')
  const [description, setDescription]  = useState(draft?.description ?? '')
  const [tiers, setTiers]               = useState<Tier[]>(() =>
    draft?.ticketTiers?.length
      ? draft.ticketTiers.map(t => ({ ...t, subtitle: '' }))
      : DEFAULT_TIERS
  )
  const [sheetOpen,   setSheetOpen]   = useState(false)
  const [editingTier, setEditingTier] = useState<Tier | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError,  setSubmitError]  = useState('')

  const openAdd  = () => { setEditingTier(null); setSheetOpen(true) }
  const openEdit = (tier: Tier) => { setEditingTier(tier); setSheetOpen(true) }
  const closeSheet = () => { setSheetOpen(false); setEditingTier(null) }

  const handleSave = (name: string, price: string) => {
    if (editingTier) {
      setTiers(ts => ts.map(t => t.id === editingTier.id ? { ...t, name, price } : t))
    } else {
      setTiers(ts => [...ts, { id: `tier-${Date.now()}`, name, subtitle: '', price }])
    }
    closeSheet()
  }

  // Banner image — pre-populate from AI draft URL or user selection
  const [bannerUrl,  setBannerUrl]  = useState<string | null>(draft?.bannerUrl ?? null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  // Venue media — track File objects alongside preview URLs
  const [mediaPreviews,  setMediaPreviews]  = useState<string[]>([])
  const [mediaFileObjs,  setMediaFileObjs]  = useState<File[]>([])
  const mediaInputRef = useRef<HTMLInputElement>(null)

  // Populate media from AI draft
  useEffect(() => {
    const draftFiles = draft?.mediaFiles ?? []
    if (!draftFiles.length) return
    const urls = draftFiles.map(f => URL.createObjectURL(f))
    setMediaPreviews(urls)
    setMediaFileObjs(draftFiles)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (bannerUrl) URL.revokeObjectURL(bannerUrl)
    setBannerUrl(URL.createObjectURL(file))
    setBannerFile(file)
    e.target.value = ''
  }

  const handleMediaAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const added = Array.from(e.target.files ?? [])
    setMediaPreviews(prev => [...prev, ...added.map(f => URL.createObjectURL(f))])
    setMediaFileObjs(prev => [...prev, ...added])
    e.target.value = ''
  }

  const emptySlots = Math.max(0, 3 - mediaPreviews.length)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const formData = new FormData()
      formData.append('draft', JSON.stringify({
        name:        eventName,
        date,
        location,
        description,
        ticketTiers: tiers.map(({ id, name, price }) => ({ id, name, price })),
        // Pass through existing bannerUrl if user didn't upload a new one
        ...(bannerUrl && !bannerFile && { bannerUrl }),
      }))
      if (bannerFile) formData.append('banner', bannerFile)
      mediaFileObjs.forEach(f => formData.append('media', f))
      const created = await api.createEvent(formData)
      onEventCreated?.(created.id)
      onNavigate('event-created')
    } catch {
      setSubmitError('Could not save event. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <TopBar onBack={onBack} />

      {/* AI unavailable notice */}
      {aiWarning && (
        <div className="low-confidence-banner" style={{ borderColor: 'rgba(142,142,147,0.4)', color: '#8e8e93', background: 'rgba(142,142,147,0.08)' }}>
          AI is not available at the moment. Please fill in your event details manually.
        </div>
      )}

      {/* Low-confidence AI warning */}
      {!aiWarning && draft?.lowConfidence && (
        <div className="low-confidence-banner">
          AI could not detect all details — please review and complete the fields below.
        </div>
      )}

      {/* ── Banner Image ─────────────────────────────── */}
      <div
        className="create-banner"
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
        onClick={() => bannerInputRef.current?.click()}
      >
        {!bannerUrl && (
          <div className="create-banner-placeholder">
            <CameraIcon size={28} color="#48484a" />
            <p className="create-banner-hint">Tap to add banner image</p>
          </div>
        )}
        <button
          className="edit-image-btn"
          onClick={e => { e.stopPropagation(); bannerInputRef.current?.click() }}
        >
          <EditImageIcon size={16} color="#fff" />
          {bannerUrl ? 'Edit banner' : 'Add banner'}
        </button>
      </div>
      <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerChange} />

      <h1 className="page-title">Create Event</h1>

      {/* ── Venue Photos ─────────────────────────────── */}
      <FormCard title="Venue photos" badge="Photos / Videos">
        <div className="upload-grid">
          {mediaPreviews.map((url, i) => (
            <div
              key={i}
              className="upload-box upload-box-filled"
              style={{ backgroundImage: `url(${url})` }}
            />
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <button key={i} className="upload-box" onClick={() => mediaInputRef.current?.click()}>
              <PlusIcon size={20} color="#48484a" />
              <span>Upload</span>
            </button>
          ))}
          {mediaPreviews.length >= 3 && (
            <button className="upload-box" onClick={() => mediaInputRef.current?.click()}>
              <PlusIcon size={20} color="#48484a" />
              <span>Add more</span>
            </button>
          )}
        </div>
        <p className="upload-hint">Showcase your venue with photos or short videos.</p>
      </FormCard>
      <input ref={mediaInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleMediaAdd} />

      {/* ── Event Details ─────────────────────────────── */}
      <FormCard title="Event details" badge="Required">
        <FormField label="Event Name" placeholder="e.g., Neon Nights" value={eventName} onChange={setEventName} />
        <FormField label="Date & Time" placeholder="Select date and time" value={date} onChange={setDate}
          iconRight={<CalendarIcon size={18} color="#48484a" />} />
        <FormField label="Location" placeholder="Berlin, Germany" value={location} onChange={setLocation}
          iconLeft={<LocationPinIcon size={18} color="#48484a" />} />
        <FormField label="Description" placeholder="Describe your event…" value={description} onChange={setDescription}
          multiline rows={3} />
      </FormCard>

      {/* ── Venue Details (from AI) ───────────────────── */}
      {draft?.audienceProfile && (
        <FormCard title="Venue details" badge="AI-generated">
          <div className="field-group">
            <label className="field-label">Audience Profile</label>
            <p className="venue-detail-text">{draft.audienceProfile}</p>
          </div>
        </FormCard>
      )}

      {/* ── Ticket Tiers ─────────────────────────────── */}
      <div className="list-card" style={{ margin: '0 20px 16px' }}>
        <div className="form-card-header" style={{ padding: '16px 16px 4px' }}>
          <h3 className="form-card-title">Ticket tiers</h3>
        </div>
        {tiers.map(({ id, name, subtitle, price }, i) => (
          <div key={id}>
            {i > 0 && <div className="list-separator" />}
            <button className="list-row list-row-btn" onClick={() => openEdit({ id, name, subtitle, price })}>
              <span className="list-info">
                <span className="list-name">{name}</span>
                {subtitle && <span className="list-subtitle">{subtitle}</span>}
              </span>
              <span className="list-amount">{price}</span>
              <ChevronRightIcon size={16} color="#48484a" />
            </button>
          </div>
        ))}
        <div className="list-separator" />
        <button className="add-tier-btn" onClick={openAdd}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          Add tier
        </button>
      </div>

      {/* ── VIP Analytics ─────────────────────────────── */}
      <FormCard>
        <div className="toggle-row">
          <div className="toggle-info">
            <h3>VIP Analytics</h3>
            <p>Track high-paying guests for your digital "black book". This helps your team recognize repeat VIPs and personalize service.</p>
          </div>
          <ToggleSwitch checked={vipAnalytics} onChange={setVipAnalytics} />
        </div>
      </FormCard>

      {submitError && (
        <p style={{ color: '#ff453a', fontSize: 13, textAlign: 'center', margin: '0 20px 8px' }}>{submitError}</p>
      )}

      <SubmitButton label={isSubmitting ? 'Saving…' : 'Create Event'} onClick={handleSubmit} disabled={isSubmitting} />

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

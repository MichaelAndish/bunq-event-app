import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar'
import {
  SearchIcon, ChevronRightIcon,
  PlusIcon, GridAppsIcon, MusicNoteIcon,
} from '../components/Icons'
import { api } from '../api/client'
import type { EventRow } from '../api/client'
import type { Page } from '../App'

type Props = { mock: boolean; onNavigate: (page: Page) => void; onBack: () => void; onSelectEvent?: (id: string) => void }

const ICON_GRADIENTS = [
  'linear-gradient(135deg, #bf5af2, #9b59b6)',
  'linear-gradient(135deg, #0a84ff, #00c7be)',
  'linear-gradient(135deg, #30d158, #1e7a38)',
  'linear-gradient(135deg, #ff9500, #e67e00)',
  'linear-gradient(135deg, #ff375f, #c0392b)',
]

const MOCK_DISCOVER = [
  { id: 'summer-music', name: 'Summer Music Fest', location: 'Berlin, Germany',   gradient: ICON_GRADIENTS[0] },
  { id: 'tech-network', name: 'Tech Networking',   location: 'London, UK',        gradient: ICON_GRADIENTS[2] },
  { id: 'art-exhibit',  name: 'Art Exhibition',    location: 'Paris, France',     gradient: ICON_GRADIENTS[3] },
]

export default function Events({ mock, onNavigate, onBack, onSelectEvent }: Props) {
  const [liveEvents, setLiveEvents] = useState<EventRow[]>([])

  useEffect(() => {
    if (mock) return
    api.listEvents()
      .then(rows => setLiveEvents(rows.filter(e => e.status === 'live' || e.status === 'draft')))
      .catch(() => {})
  }, [mock])

  const discoverEvents = mock
    ? MOCK_DISCOVER
    : liveEvents.map((e, i) => ({
        id:       e.id,
        name:     e.name,
        location: e.location,
        gradient: ICON_GRADIENTS[i % ICON_GRADIENTS.length],
      }))

  return (
    <div>
      <TopBar onBack={onBack} />
      <h1 className="page-title">Events</h1>

      <div className="list-card">
        <button className="list-row list-row-btn" onClick={() => onNavigate('ai-create-event')}>
          <span className="list-icon" style={{ background: 'linear-gradient(135deg, #bf5af2, #9b59b6)' }}>
            <PlusIcon size={20} color="#fff" />
          </span>
          <span className="list-info">
            <span className="list-name">Create Event</span>
            <span className="list-subtitle">Set up a new event with AI</span>
          </span>
          <ChevronRightIcon size={16} color="#48484a" />
        </button>
        <div className="list-separator" />
        <button className="list-row list-row-btn" onClick={() => onNavigate('your-events')}>
          <span className="list-icon" style={{ background: 'linear-gradient(135deg, #0a84ff, #00c7be)' }}>
            <GridAppsIcon size={20} color="#fff" />
          </span>
          <span className="list-info">
            <span className="list-name">Your Events</span>
            <span className="list-subtitle">Active, joined &amp; archived</span>
          </span>
          <ChevronRightIcon size={16} color="#48484a" />
        </button>
      </div>

      <div className="section-header">
        <h2 className="section-title">Discover Events</h2>
        <button className="section-icon-btn">
          <SearchIcon size={20} color="#8e8e93" />
        </button>
      </div>

      {discoverEvents.length > 0 ? (
        <div className="list-card">
          {discoverEvents.map(({ id, name, location, gradient }, i) => (
            <div key={id}>
              {i > 0 && <div className="list-separator" />}
              <button className="list-row list-row-btn" onClick={() => { onSelectEvent?.(id); onNavigate('guest-preview') }}>
                <span className="list-icon" style={{ background: gradient }}>
                  <MusicNoteIcon size={20} color="#fff" />
                </span>
                <span className="list-info">
                  <span className="list-name">{name}</span>
                  <span className="list-subtitle">{location}</span>
                </span>
                <ChevronRightIcon size={16} color="#48484a" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="list-card">
          <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
            <span style={{ padding: '8px 0' }}>No events yet. Create one to get started.</span>
          </div>
        </div>
      )}
    </div>
  )
}

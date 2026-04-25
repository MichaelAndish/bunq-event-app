import { useState, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import {
  ChevronRightIcon, CalendarIcon, LocationPinIcon,
  MusicNoteIcon, PeopleGroupIcon, CameraIcon,
  GridAppsIcon,
} from '../components/Icons'
import { api } from '../api/client'
import type { EventRow } from '../api/client'
import type { Page } from '../App'

type Props = { mock: boolean; onBack: () => void; onNavigate: (page: Page) => void; onSelectEvent?: (id: string) => void }
type Tab = 'organising' | 'joined' | 'archived'

type EventItem = {
  id: string
  name: string
  date: string
  location: string
  gradient: string
  badge?: string
  badgeColor?: string
}

const GRADIENTS = [
  'linear-gradient(135deg, #bf5af2, #9b59b6)',
  'linear-gradient(135deg, #0a84ff, #00c7be)',
  'linear-gradient(135deg, #30d158, #1e7a38)',
  'linear-gradient(135deg, #ff9500, #e67e00)',
]

const MOCK_ORGANISING: EventItem[] = [
  { id: 'neon-nights', name: 'Neon Nights',     date: 'Tonight · 10 PM', location: 'Berlin, Germany',       gradient: GRADIENTS[0], badge: 'Live',     badgeColor: '#30d158' },
  { id: 'tech-summit', name: 'Tech Summit 2026', date: 'May 3 · 9 AM',   location: 'Amsterdam, Netherlands', gradient: GRADIENTS[1], badge: 'Upcoming', badgeColor: '#0a84ff' },
]
const MOCK_JOINED: EventItem[] = [
  { id: 'summer-music', name: 'Summer Music Fest',  date: 'Jun 15 · 4 PM', location: 'Berlin, Germany', gradient: GRADIENTS[0], badge: 'Ticket confirmed', badgeColor: '#30d158' },
  { id: 'art-exhibit',  name: 'Art Exhibition',     date: 'May 2 · 11 AM', location: 'Paris, France',   gradient: GRADIENTS[2], badge: 'Ticket confirmed', badgeColor: '#30d158' },
  { id: 'tech-network', name: 'Tech Networking',    date: 'Apr 28 · 6 PM', location: 'London, UK',      gradient: GRADIENTS[3], badge: 'Ticket confirmed', badgeColor: '#30d158' },
]
const MOCK_ARCHIVED: EventItem[] = [
  { id: 'winter-gala',  name: 'Winter Gala 2025',  date: 'Dec 31, 2025', location: 'Vienna, Austria',  gradient: 'linear-gradient(135deg, #636366, #48484a)' },
  { id: 'spring-fest',  name: 'Spring Festival',   date: 'Mar 20, 2025', location: 'London, UK',       gradient: 'linear-gradient(135deg, #636366, #48484a)' },
  { id: 'neon-2024',    name: 'Neon Nights 2024',  date: 'Dec 1, 2024',  location: 'Berlin, Germany',  gradient: 'linear-gradient(135deg, #636366, #48484a)' },
]

function badgeForStatus(status: EventRow['status']): { badge: string; badgeColor: string } | undefined {
  if (status === 'live')     return { badge: 'Live',     badgeColor: '#30d158' }
  if (status === 'draft')    return { badge: 'Draft',    badgeColor: '#0a84ff' }
  if (status === 'archived') return { badge: 'Archived', badgeColor: '#636366' }
}

function EventList({ items, target, onNavigate, onSelect }: { items: EventItem[]; target?: Page; onNavigate: (p: Page) => void; onSelect?: (id: string) => void }) {
  if (!items.length) {
    return (
      <div className="list-card">
        <div className="list-row" style={{ color: '#8e8e93', fontSize: 14 }}>
          <span style={{ padding: '8px 0' }}>Nothing here yet</span>
        </div>
      </div>
    )
  }

  return (
    <div className="list-card">
      {items.map(({ id, name, date, location, gradient, badge, badgeColor }, i) => (
        <div key={id}>
          {i > 0 && <div className="list-separator" />}
          <button
            className="list-row list-row-btn"
            style={{ alignItems: 'flex-start', paddingTop: 14, paddingBottom: 14 }}
            onClick={() => { onSelect?.(id); target && onNavigate(target) }}
          >
            <span className="list-icon" style={{ background: gradient, marginTop: 2 }}>
              <MusicNoteIcon size={20} color="#fff" />
            </span>
            <span className="list-info">
              <span className="list-name">{name}</span>
              <span className="list-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <CalendarIcon size={11} color="#636366" />
                {date}
                <span style={{ color: '#3a3a3c' }}>·</span>
                <LocationPinIcon size={11} color="#636366" />
                {location}
              </span>
              {badge && (
                <span className="ye-badge" style={{ color: badgeColor, borderColor: badgeColor, marginTop: 6 }}>
                  {badge}
                </span>
              )}
            </span>
            <span style={{ marginTop: 4, flexShrink: 0 }}>
              <ChevronRightIcon size={16} color="#48484a" />
            </span>
          </button>
        </div>
      ))}
    </div>
  )
}

export default function YourEvents({ mock, onBack, onNavigate, onSelectEvent }: Props) {
  const [tab, setTab] = useState<Tab>('organising')
  const [liveEvents, setLiveEvents] = useState<EventRow[]>([])

  useEffect(() => {
    if (mock) return
    api.listEvents().then(setLiveEvents).catch(() => {})
  }, [mock])

  const organising: EventItem[] = mock
    ? MOCK_ORGANISING
    : liveEvents
        .filter(e => e.status === 'live' || e.status === 'draft')
        .map((e, i) => ({ id: e.id, name: e.name, date: e.date, location: e.location, gradient: GRADIENTS[i % GRADIENTS.length], ...badgeForStatus(e.status) }))

  const archived: EventItem[] = mock
    ? MOCK_ARCHIVED
    : liveEvents
        .filter(e => e.status === 'archived')
        .map((e, i) => ({ id: e.id, name: e.name, date: e.date, location: e.location, gradient: 'linear-gradient(135deg, #636366, #48484a)' }))

  const joined: EventItem[] = mock ? MOCK_JOINED : []

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'organising', label: 'Organising', count: organising.length },
    { id: 'joined',     label: 'Joined',     count: joined.length },
    { id: 'archived',   label: 'Archived',   count: archived.length },
  ]

  return (
    <div>
      <PageHeader onBack={onBack} title="Your Events" />

      <div className="ye-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`ye-tab${tab === t.id ? ' ye-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className={`ye-tab-count${tab === t.id ? ' ye-tab-count--active' : ''}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === 'organising' && <EventList items={organising} target="manage-event"  onNavigate={onNavigate} onSelect={onSelectEvent} />}
      {tab === 'joined'     && <EventList items={joined}     target="guest-preview" onNavigate={onNavigate} />}
      {tab === 'archived'   && <EventList items={archived}                          onNavigate={onNavigate} />}
    </div>
  )
}

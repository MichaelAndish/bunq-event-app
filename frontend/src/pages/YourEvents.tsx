import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import {
  ChevronRightIcon, CalendarIcon, LocationPinIcon,
  MusicNoteIcon, PeopleGroupIcon, CameraIcon,
  GridAppsIcon,
} from '../components/Icons'
import type { Page } from '../App'

type Props = { onBack: () => void; onNavigate: (page: Page) => void }

type Tab = 'organising' | 'joined' | 'archived'

type EventItem = {
  id: string
  name: string
  date: string
  location: string
  iconBg: string
  Icon: React.FC<{ size?: number; color?: string }>
  badge?: string
  badgeColor?: string
  role?: 'organiser' | 'attendee'
}

const ORGANISING_EVENTS: EventItem[] = [
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    date: 'Tonight · 10 PM',
    location: 'Berlin, Germany',
    iconBg: 'linear-gradient(135deg, #bf5af2, #9b59b6)',
    Icon: MusicNoteIcon,
    badge: 'Live',
    badgeColor: '#30d158',
  },
  {
    id: 'tech-summit',
    name: 'Tech Summit 2026',
    date: 'May 3 · 9 AM',
    location: 'Amsterdam, Netherlands',
    iconBg: 'linear-gradient(135deg, #0a84ff, #00c7be)',
    Icon: PeopleGroupIcon,
    badge: 'Upcoming',
    badgeColor: '#0a84ff',
  },
]

const JOINED_EVENTS: EventItem[] = [
  {
    id: 'summer-music',
    name: 'Summer Music Fest',
    date: 'Jun 15 · 4 PM',
    location: 'Berlin, Germany',
    iconBg: 'linear-gradient(135deg, #bf5af2, #7b4fa0)',
    Icon: MusicNoteIcon,
    badge: 'Ticket confirmed',
    badgeColor: '#30d158',
  },
  {
    id: 'art-exhibition',
    name: 'Art Exhibition',
    date: 'May 2 · 11 AM',
    location: 'Paris, France',
    iconBg: 'linear-gradient(135deg, #ff9500, #e67e00)',
    Icon: CameraIcon,
    badge: 'Ticket confirmed',
    badgeColor: '#30d158',
  },
  {
    id: 'tech-networking',
    name: 'Tech Networking',
    date: 'Apr 28 · 6 PM',
    location: 'London, UK',
    iconBg: 'linear-gradient(135deg, #30d158, #1e7a38)',
    Icon: PeopleGroupIcon,
    badge: 'Ticket confirmed',
    badgeColor: '#30d158',
  },
]

const ARCHIVED_EVENTS: EventItem[] = [
  {
    id: 'winter-gala',
    name: 'Winter Gala 2025',
    date: 'Dec 31, 2025',
    location: 'Vienna, Austria',
    iconBg: 'linear-gradient(135deg, #636366, #48484a)',
    Icon: MusicNoteIcon,
    role: 'organiser',
  },
  {
    id: 'spring-festival',
    name: 'Spring Festival',
    date: 'Mar 20, 2025',
    location: 'London, UK',
    iconBg: 'linear-gradient(135deg, #636366, #48484a)',
    Icon: GridAppsIcon,
    role: 'organiser',
  },
  {
    id: 'neon-nights-2024',
    name: 'Neon Nights 2024',
    date: 'Dec 1, 2024',
    location: 'Berlin, Germany',
    iconBg: 'linear-gradient(135deg, #636366, #48484a)',
    Icon: MusicNoteIcon,
    role: 'attendee',
  },
]

const TABS: { id: Tab; label: string; count: number }[] = [
  { id: 'organising', label: 'Organising', count: ORGANISING_EVENTS.length },
  { id: 'joined',     label: 'Joined',     count: JOINED_EVENTS.length },
  { id: 'archived',   label: 'Archived',   count: ARCHIVED_EVENTS.length },
]

function RolePill({ role }: { role: 'organiser' | 'attendee' }) {
  return role === 'organiser'
    ? <span className="ye-role-pill ye-role-pill--organiser">Organiser</span>
    : <span className="ye-role-pill ye-role-pill--attendee">Attendee</span>
}

function EventList({ events, target, showRole, onNavigate }: {
  events: EventItem[]
  target?: Page
  showRole?: boolean
  onNavigate: (page: Page) => void
}) {
  if (!events.length) {
    return (
      <div className="ye-empty">
        <p className="ye-empty-text">Nothing here yet</p>
      </div>
    )
  }

  return (
    <div className="list-card">
      {events.map(({ id, name, date, location, iconBg, Icon, badge, badgeColor, role }, i) => (
        <div key={id}>
          {i > 0 && <div className="list-separator" />}
          <button
            className="list-row list-row-btn"
            style={{ alignItems: 'flex-start', paddingTop: 14, paddingBottom: 14 }}
            onClick={() => target && onNavigate(target)}
          >
            <span className="list-icon" style={{ background: iconBg, marginTop: 2 }}>
              <Icon size={20} color="#fff" />
            </span>
            <span className="list-info">
              <span className="list-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {name}
                {showRole && role && <RolePill role={role} />}
              </span>
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

export default function YourEvents({ onBack, onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>('organising')

  return (
    <div>
      <PageHeader onBack={onBack} title="Your Events" />

      <div className="ye-tabs">
        {TABS.map(t => (
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

      {tab === 'organising' && <EventList events={ORGANISING_EVENTS} target="manage-event"  onNavigate={onNavigate} />}
      {tab === 'joined'     && <EventList events={JOINED_EVENTS}     target="guest-preview" onNavigate={onNavigate} />}
      {tab === 'archived'   && <EventList events={ARCHIVED_EVENTS}   showRole               onNavigate={onNavigate} />}
    </div>
  )
}

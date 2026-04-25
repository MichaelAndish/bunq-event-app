import TopBar from '../components/TopBar'
import {
  SearchIcon, ChevronRightIcon,
  PlusIcon, GridAppsIcon, CameraIcon,
  MusicNoteIcon, PeopleGroupIcon,
} from '../components/Icons'
import type { Page } from '../App'

type Props = { onNavigate: (page: Page) => void; onBack: () => void }

const MY_EVENT_ACTIONS: {
  id: string
  label: string
  subtitle: string
  iconBg: string
  Icon: React.FC<{ size?: number; color?: string }>
  target?: Page
}[] = [
  {
    id: 'create',
    label: 'Create Event',
    subtitle: 'Set up a new event with AI',
    iconBg: 'linear-gradient(135deg, #bf5af2, #9b59b6)',
    Icon: PlusIcon,
    target: 'ai-create-event',
  },
  {
    id: 'your-events',
    label: 'Your Events',
    subtitle: 'Active, joined & archived',
    iconBg: 'linear-gradient(135deg, #0a84ff, #00c7be)',
    Icon: GridAppsIcon,
    target: 'your-events',
  },
]

const JOIN_EVENTS = [
  {
    id: 'summer-music',
    name: 'Summer Music Fest',
    location: 'Berlin, Germany',
    iconBg: 'linear-gradient(135deg, #bf5af2, #7b4fa0)',
    Icon: MusicNoteIcon,
  },
  {
    id: 'tech-networking',
    name: 'Tech Networking',
    location: 'London, UK',
    iconBg: 'linear-gradient(135deg, #30d158, #1e7a38)',
    Icon: PeopleGroupIcon,
  },
  {
    id: 'art-exhibition',
    name: 'Art Exhibition',
    location: 'Paris, France',
    iconBg: 'linear-gradient(135deg, #ff9500, #e67e00)',
    Icon: CameraIcon,
  },
]

export default function Events({ onNavigate, onBack }: Props) {
  return (
    <div>
      <TopBar onBack={onBack} />
      <h1 className="page-title">Events</h1>

      <div className="list-card">
        {MY_EVENT_ACTIONS.map(({ id, label, subtitle, iconBg, Icon, target }, i) => (
          <div key={id}>
            {i > 0 && <div className="list-separator" />}
            <button
              className="list-row list-row-btn"
              onClick={() => target && onNavigate(target)}
            >
              <span className="list-icon" style={{ background: iconBg }}>
                <Icon size={20} color="#fff" />
              </span>
              <span className="list-info">
                <span className="list-name">{label}</span>
                <span className="list-subtitle">{subtitle}</span>
              </span>
              <ChevronRightIcon size={16} color="#48484a" />
            </button>
          </div>
        ))}
      </div>

      <div className="section-header">
        <h2 className="section-title">Discover Events</h2>
        <button className="section-icon-btn">
          <SearchIcon size={20} color="#8e8e93" />
        </button>
      </div>

      <div className="list-card">
        {JOIN_EVENTS.map(({ id, name, location, iconBg, Icon }, i) => (
          <div key={id}>
            {i > 0 && <div className="list-separator" />}
            <button className="list-row list-row-btn">
              <span className="list-icon" style={{ background: iconBg }}>
                <Icon size={20} color="#fff" />
              </span>
              <span className="list-info">
                <span className="list-name">{name}</span>
                <span className="list-subtitle">{location}</span>
              </span>
              <ChevronRightIcon size={16} color="#48484a" />
            </button>
          </div>
        ))}
        <div className="list-separator" />
        <button className="list-add-link">View More Events</button>
      </div>
    </div>
  )
}

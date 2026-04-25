type IconProps = { size?: number; color?: string }

export function HomeIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 21v-8h6v8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CardsIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth="1.8" />
      <path d="M2 10h20" stroke={color} strokeWidth="1.8" />
    </svg>
  )
}

export function SavingsIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M19 9.5C19 6.46 15.87 4 12 4S5 6.46 5 9.5c0 1.8.9 3.4 2.3 4.5L7 19h10l-.3-5c1.4-1.1 2.3-2.7 2.3-4.5z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 19v1a1 1 0 001 1h4a1 1 0 001-1v-1" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="15" cy="9" r="1" fill={color} />
    </svg>
  )
}

export function StocksIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="12" width="4" height="9" rx="1" fill={color} />
      <rect x="10" y="7" width="4" height="14" rx="1" fill={color} />
      <rect x="17" y="3" width="4" height="18" rx="1" fill={color} />
    </svg>
  )
}

export function CryptoIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L4 6v6c0 5 3.5 9.3 8 10.5C16.5 21.3 20 17 20 12V6l-8-4z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function QRCodeIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" />
      <rect x="5" y="5" width="3" height="3" fill={color} />
      <rect x="16" y="5" width="3" height="3" fill={color} />
      <rect x="5" y="16" width="3" height="3" fill={color} />
      <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17h3" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M10 4L6 8l4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 6l4 4 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowUpIcon({ size = 14, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M7 11V3M3 7l4-4 4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SearchIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6" stroke={color} strokeWidth="1.8" />
      <path d="M13.5 13.5L17 17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function WalletIcon({ size = 20, color = '#fff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="2" y="5" width="16" height="12" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M2 9h16" stroke={color} strokeWidth="1.6" />
      <circle cx="14" cy="13" r="1.2" fill={color} />
    </svg>
  )
}

export function HouseSmallIcon({ size = 20, color = '#fff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M2.5 9L10 3l7.5 6V17a1 1 0 01-1 1H3.5a1 1 0 01-1-1V9z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.5 18v-6h5v6" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ExchangeIcon({ size = 20, color = '#fff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M4 7h12M13 4l3 3-3 3" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 13H4M7 10l-3 3 3 3" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function TrendUpIcon({ size = 14, color = '#30d158' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M1 10L5 6l3 3 5-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 3h4v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MailIcon({ size = 16, color = '#fff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="10" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M1 5l7 5 7-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PencilIcon({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 4l3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function TrashIcon({ size = 16, color = '#ff453a' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function InfoCircleIcon({ size = 16, color = '#0a84ff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
      <path d="M8 7v5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5" r="0.8" fill={color} />
    </svg>
  )
}

export function EditImageIcon({ size = 16, color = '#fff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 12l3-3 2 2 4-5 3 3v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-1z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="5.5" cy="5.5" r="1.5" stroke={color} strokeWidth="1.4" />
    </svg>
  )
}

export function EyeIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M1 10s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

export function SlidersIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="7"  cy="5"  r="2" fill={color} />
      <circle cx="13" cy="10" r="2" fill={color} />
      <circle cx="7"  cy="15" r="2" fill={color} />
    </svg>
  )
}

export function CircleCheckIcon({ size = 32, color = '#0a84ff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke={color} strokeWidth="2" />
      <path d="M10 16l4 4 8-8" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DownloadIcon({ size = 16, color = '#fff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 2v8M5 7l3 3 3-3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13h10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function CopyIcon({ size = 15, color = '#0a84ff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="5" y="1" width="9" height="11" rx="1.5" stroke={color} strokeWidth="1.5" />
      <path d="M3 4H2a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function CalendarIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="14" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M2 8h16" stroke={color} strokeWidth="1.6" />
      <path d="M6 2v3M14 2v3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="5" y="11" width="2.5" height="2.5" rx="0.5" fill={color} />
      <rect x="8.75" y="11" width="2.5" height="2.5" rx="0.5" fill={color} />
      <rect x="12.5" y="11" width="2.5" height="2.5" rx="0.5" fill={color} />
    </svg>
  )
}

export function LocationPinIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 2a6 6 0 016 6c0 4-6 10-6 10S4 12 4 8a6 6 0 016-6z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="10" cy="8" r="2" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

export function PlusIcon({ size = 20, color = '#fff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 4v12M4 10h12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function GridAppsIcon({ size = 20, color = '#fff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="6" height="6" rx="1.5" fill={color} />
      <rect x="11" y="3" width="6" height="6" rx="1.5" fill={color} />
      <rect x="3" y="11" width="6" height="6" rx="1.5" fill={color} />
      <rect x="11" y="11" width="6" height="6" rx="1.5" fill={color} />
    </svg>
  )
}

export function CameraIcon({ size = 20, color = '#fff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M7 4l1.5-1.5h3L13 4h4a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

export function MusicNoteIcon({ size = 20, color = '#fff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M8 15V5l9-2v10" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="15" r="2" fill={color} />
      <circle cx="15" cy="13" r="2" fill={color} />
    </svg>
  )
}

export function PeopleGroupIcon({ size = 20, color = '#fff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="7.5" cy="6" r="2.5" stroke={color} strokeWidth="1.6" />
      <path d="M2 16c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="14" cy="6.5" r="2" stroke={color} strokeWidth="1.5" />
      <path d="M17 16c0-2.5-1.3-4-3-4.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function MessageBubbleIcon({ size = 16, color = '#fff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M18 10c0 4-3.6 7-8 7a8.8 8.8 0 01-3.6-.77L2 18l1.57-4A6.6 6.6 0 012 10c0-4 3.6-7 8-7s8 3 8 7z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export function XIcon({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function UsersIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="8" cy="7" r="3" stroke={color} strokeWidth="1.6" />
      <path d="M2 17c0-3 2.7-5 6-5s6 2 6 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 4a3 3 0 010 6M18 17c0-3-1.3-4.5-4-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function SparklesIcon({ size = 20, color = '#0a84ff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" fill={color} opacity="0.9" />
      <path d="M5 5l1.2 3.6L9.8 10l-3.6 1.4L5 15l-1.2-3.6L0 10l3.6-1.4L5 5z" fill={color} opacity="0.5" />
    </svg>
  )
}

export function SendIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M18 10L2 3l4 7-4 7 16-7z" fill={color} />
    </svg>
  )
}

export function MicIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="7" y="2" width="6" height="10" rx="3" stroke={color} strokeWidth="1.6" />
      <path d="M4 10a6 6 0 0012 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 16v3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function StopIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="4" y="4" width="12" height="12" rx="2.5" fill={color} />
    </svg>
  )
}

export function ReceiptIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M5 2h10v16l-2-1.5L11 18l-2-1.5L7 18l-2-1.5V2z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 7h4M8 10h4M8 13h2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

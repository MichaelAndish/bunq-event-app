import { useState } from 'react'
import TopBar from '../components/TopBar'
import { CircleCheckIcon, DownloadIcon, CopyIcon, EyeIcon, SlidersIcon } from '../components/Icons'
import type { Page } from '../App'

// 21×21 QR code (Version 1) — visual approximation with correct finder patterns
const QR_GRID = [
  '111111101011001111111',
  '100000100100101000001',
  '101110101101001011101',
  '101110100010101011101',
  '101110101010001011101',
  '100000100001001000001',
  '111111101010101111111',
  '000000001100010100110',
  '101011101101011001010',
  '010100001010100110101',
  '110011100101011010010',
  '001100001010010101101',
  '100110101011001010011',
  '000000001100101001010',
  '111111100100101001010',
  '100000101100001010011',
  '101110101001010110010',
  '101110100101011001010',
  '101110101010001001101',
  '100000101100100110101',
  '111111100101011010011',
]

function QRCode() {
  const S = 7
  const size = 21 * S
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-label="Event QR code"
    >
      <rect width={size} height={size} fill="white" />
      {QR_GRID.flatMap((row, r) =>
        row.split('').map((cell, c) =>
          cell === '1' ? (
            <rect key={`${r}-${c}`} x={c * S} y={r * S} width={S} height={S} fill="#111111" />
          ) : null
        )
      )}
    </svg>
  )
}

type Props = { onNavigate: (page: Page) => void }

export default function EventCreated({ onNavigate }: Props) {
  const [isLive, setIsLive] = useState(true)

  return (
    <div>
      <TopBar />

      <div className="success-hero">
        <div className="success-icon">
          <CircleCheckIcon size={32} color={isLive ? '#0a84ff' : '#8e8e93'} />
        </div>
        <h1 className="success-title">
          {isLive ? 'Your Event is Live!' : 'Your Event is Offline'}
        </h1>
        <p className="success-subtitle">
          {isLive
            ? 'Your event is published. Share it with your audience.'
            : 'Your event is hidden. Switch to Live when ready to share.'}
        </p>
      </div>

      {/* Event Details */}
      <div className="ev-details-card">
        <div className="ev-details-header">
          <span className="ev-details-label">Event details</span>
          <div className="status-toggle">
            <button
              className={`status-toggle-btn${isLive ? ' active-live' : ''}`}
              onClick={() => setIsLive(true)}
            >
              Live
            </button>
            <button
              className={`status-toggle-btn${!isLive ? ' active-offline' : ''}`}
              onClick={() => setIsLive(false)}
            >
              Offline
            </button>
          </div>
        </div>
        <div className="ev-detail-row">
          <span className="ev-detail-key">Event</span>
          <span className="ev-detail-val">bunq demo day</span>
        </div>
        <div className="ev-detail-row">
          <span className="ev-detail-key">Date</span>
          <span className="ev-detail-val">Sat, 25 Apr • 14:00</span>
        </div>
        <div className="ev-detail-row">
          <span className="ev-detail-key">Location</span>
          <span className="ev-detail-val">bunq HQ</span>
        </div>
      </div>

      <button className="analytics-link-btn" onClick={() => onNavigate('analytics')}>See event analytics</button>

      {/* Share */}
      <div className="share-card">
        <h3 className="share-title">Share</h3>

        <div className="qr-container">
          <QRCode />
        </div>

        <p className="qr-caption">Use this QR to collect money from guests</p>

        <button className="download-qr-btn">
          <DownloadIcon size={16} color="#fff" />
          Download QR
        </button>

        <p className="link-section-title">Sharable link</p>
        <div className="link-row">
          <span className="link-url">events.bunq.com/demo</span>
          <button className="copy-btn">
            <CopyIcon size={15} color="#0a84ff" />
            Copy
          </button>
        </div>
      </div>

      <div className="action-pair">
        <button className="action-pair-btn secondary" onClick={() => onNavigate('guest-preview')}>
          <EyeIcon size={16} color="#fff" />
          Guest Preview
        </button>
        <button className="action-pair-btn primary" onClick={() => onNavigate('manage-event')}>
          <SlidersIcon size={16} color="#fff" />
          Manage Event
        </button>
      </div>
    </div>
  )
}

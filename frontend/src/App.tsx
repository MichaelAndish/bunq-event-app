import { useState, useEffect } from 'react'
import './App.css'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Agent from './pages/Agent'
import Events from './pages/Events'
import AICreateEvent from './pages/AICreateEvent'
import CreateEvent from './pages/CreateEvent'
import EventCreated from './pages/EventCreated'
import GuestPreview from './pages/GuestPreview'
import ManageEvent from './pages/ManageEvent'
import Analytics from './pages/Analytics'
import CustomerInsights from './pages/CustomerInsights'
import TransactionHistory from './pages/TransactionHistory'
import YourEvents from './pages/YourEvents'
import BuyTicket from './pages/BuyTicket'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentRejected from './pages/PaymentRejected'
import { api } from './api/client'

export type Page =
  | 'home' | 'cards' | 'savings' | 'stocks' | 'crypto'
  | 'events' | 'your-events' | 'ai-create-event' | 'create-event' | 'event-created'
  | 'guest-preview' | 'manage-event' | 'analytics'
  | 'customer-insights' | 'transaction-history'
  | 'buy-ticket' | 'payment-success' | 'payment-rejected'

export type ApiStatus = 'loading' | 'online' | 'offline'

export type EventDraft = {
  name: string
  date: string
  location: string
  description: string
  ticketTiers: { id: string; name: string; price: string }[]
  mediaFiles?: File[]
  audienceProfile?: string
  imagePrompt?: string
  lowConfidence?: boolean
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="placeholder-page">
      <h1 className="page-title">{title}</h1>
      <p className="placeholder-hint">Coming soon</p>
    </div>
  )
}

export default function App() {
  const [history,           setHistory]           = useState<Page[]>(['home'])
  const [eventDraft,        setEventDraft]        = useState<EventDraft | null>(null)
  const [mock,              setMock]              = useState(false)
  const [aiAvailable,       setAiAvailable]       = useState(false)
  const [aiWarning,         setAiWarning]         = useState(false)
  const [apiStatus,         setApiStatus]         = useState<ApiStatus>('loading')
  const [selectedEventId,   setSelectedEventId]   = useState<string | null>(null)
  const [selectedTierId,    setSelectedTierId]    = useState<string | null>(null)
  const [purchasedTicketId, setPurchasedTicketId] = useState<string | null>(null)

  useEffect(() => {
    let onlineSignalled = false

    const markOnline = () => {
      if (!onlineSignalled) {
        onlineSignalled = true
        setApiStatus('online')
      }
    }

    const p1 = api.clientStatus()
      .then(s => { setMock(s.mock); markOnline() })
      .catch(() => {})

    const p2 = api.agentStatus()
      .then(s => { setAiAvailable(s.aiAvailable); markOnline() })
      .catch(() => {})

    Promise.all([p1, p2]).then(() => {
      if (!onlineSignalled) setApiStatus('offline')
    })
  }, [])

  // If API goes offline, force back to home so we don't strand users on inner pages
  useEffect(() => {
    if (apiStatus === 'offline') setHistory(['home'])
  }, [apiStatus])

  const page    = history[history.length - 1]
  const isLocked = apiStatus !== 'online'

  const goBack  = () => { if (!isLocked) setHistory(h => h.length > 1 ? h.slice(0, -1) : h) }
  const resetTo = (p: Page) => { if (!isLocked) setHistory([p]) }

  const navigate = (p: Page) => {
    if (isLocked) return

    if (p === 'ai-create-event' && !aiAvailable && !mock) {
      setAiWarning(true)
      setHistory(h => [...h, 'create-event'])
      return
    }
    setAiWarning(false)
    setHistory(h => [...h, p])
  }

  return (
    <div className="phone-shell">
      <div className="phone-frame">
        <div className="phone-screen">
          {/* Global API status banners — always visible above page content */}
          {apiStatus === 'loading' && (
            <div className="api-status-banner api-status-loading">
              Connecting to backend…
            </div>
          )}
          {apiStatus === 'offline' && (
            <div className="api-status-banner api-status-offline">
              ⚠ API not available — check the backend and refresh
            </div>
          )}

          {page === 'home'               && <Home mock={mock} apiStatus={apiStatus} onNavigate={navigate} />}
          {page === 'events'             && <Events mock={mock} onNavigate={navigate} onBack={goBack} onSelectEvent={setSelectedEventId} />}
          {page === 'your-events'        && <YourEvents mock={mock} onBack={goBack} onNavigate={navigate} onSelectEvent={setSelectedEventId} />}
          {page === 'ai-create-event'    && <AICreateEvent onBack={goBack} onNavigate={navigate} setDraft={setEventDraft} />}
          {page === 'create-event'       && <CreateEvent onNavigate={navigate} onBack={goBack} draft={eventDraft} aiWarning={aiWarning} onEventCreated={id => setSelectedEventId(id)} />}
          {page === 'event-created'      && <EventCreated mock={mock} eventId={selectedEventId} onNavigate={navigate} />}
          {page === 'guest-preview'      && <GuestPreview mock={mock} eventId={selectedEventId} onBack={goBack} onNavigate={navigate} onSelectTier={id => setSelectedTierId(id)} />}
          {page === 'buy-ticket'         && <BuyTicket mock={mock} eventId={selectedEventId} tierId={selectedTierId} onBack={goBack} onNavigate={navigate} onTicketCreated={id => setPurchasedTicketId(id)} />}
          {page === 'payment-success'    && <PaymentSuccess mock={mock} ticketId={purchasedTicketId} onBack={goBack} onNavigate={navigate} />}
          {page === 'payment-rejected'   && <PaymentRejected mock={mock} onBack={goBack} onNavigate={navigate} />}
          {page === 'manage-event'       && <ManageEvent mock={mock} eventId={selectedEventId} onBack={goBack} onNavigate={navigate} />}
          {page === 'analytics'          && <Analytics mock={mock} eventId={selectedEventId} onBack={goBack} onNavigate={navigate} />}
          {page === 'customer-insights'  && <CustomerInsights mock={mock} onBack={goBack} />}
          {page === 'transaction-history' && <TransactionHistory mock={mock} onBack={goBack} />}
          {page === 'cards'   && <Placeholder title="Cards" />}
          {page === 'savings' && <Placeholder title="Savings" />}
          {page === 'stocks'  && <Agent />}
          {page === 'crypto'  && <Placeholder title="Crypto" />}
        </div>
        <BottomNav active={page} onChange={resetTo} locked={isLocked} />
      </div>
    </div>
  )
}

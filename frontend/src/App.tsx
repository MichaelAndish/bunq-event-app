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

export type EventDraft = {
  name: string
  date: string
  location: string
  description: string
  ticketTiers: { id: string; name: string; price: string }[]
  mediaFiles?: File[]
  // Enrichment fields from the AI pipeline
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
  const [history,         setHistory]         = useState<Page[]>(['home'])
  const [eventDraft,      setEventDraft]      = useState<EventDraft | null>(null)
  const [mock,            setMock]            = useState(false)
  const [aiAvailable,     setAiAvailable]     = useState(false)
  const [aiWarning,       setAiWarning]       = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedTierId,  setSelectedTierId]  = useState<string | null>(null)

  useEffect(() => {
    api.clientStatus()
      .then(s => setMock(s.mock))
      .catch(() => {})
    api.agentStatus()
      .then(s => setAiAvailable(s.aiAvailable))
      .catch(() => {})
  }, [])

  const page   = history[history.length - 1]
  const goBack = () => setHistory(h => h.length > 1 ? h.slice(0, -1) : h)
  const resetTo = (p: Page) => setHistory([p])

  const navigate = (p: Page) => {
    // Intercept AI create: skip to manual if AI is not available and mock is off
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
          {page === 'home'          && <Home onNavigate={navigate} />}
          {page === 'events'           && <Events mock={mock} onNavigate={navigate} onBack={goBack} />}
          {page === 'your-events'      && <YourEvents mock={mock} onBack={goBack} onNavigate={navigate} onSelectEvent={setSelectedEventId} />}
          {page === 'ai-create-event'  && <AICreateEvent onBack={goBack} onNavigate={navigate} setDraft={setEventDraft} />}
          {page === 'create-event'     && <CreateEvent onNavigate={navigate} onBack={goBack} draft={eventDraft} aiWarning={aiWarning} onEventCreated={id => setSelectedEventId(id)} />}
          {page === 'event-created'    && <EventCreated mock={mock} eventId={selectedEventId} onNavigate={navigate} />}
          {page === 'guest-preview'    && <GuestPreview mock={mock} eventId={selectedEventId} onBack={goBack} onNavigate={navigate} onSelectTier={id => setSelectedTierId(id)} />}
          {page === 'buy-ticket'       && <BuyTicket mock={mock} eventId={selectedEventId} tierId={selectedTierId} onBack={goBack} onNavigate={navigate} />}
          {page === 'payment-success'  && <PaymentSuccess mock={mock} onBack={goBack} onNavigate={navigate} />}
          {page === 'payment-rejected' && <PaymentRejected mock={mock} onBack={goBack} onNavigate={navigate} />}
          {page === 'manage-event'     && <ManageEvent mock={mock} eventId={selectedEventId} onBack={goBack} onNavigate={navigate} />}
          {page === 'analytics'        && <Analytics mock={mock} eventId={selectedEventId} onBack={goBack} onNavigate={navigate} />}
          {page === 'customer-insights' && <CustomerInsights mock={mock} onBack={goBack} />}
          {page === 'transaction-history' && <TransactionHistory mock={mock} onBack={goBack} />}
          {page === 'cards'   && <Placeholder title="Cards" />}
          {page === 'savings' && <Placeholder title="Savings" />}
          {page === 'stocks'  && <Agent />}
          {page === 'crypto'  && <Placeholder title="Crypto" />}
        </div>
        <BottomNav active={page} onChange={resetTo} />
      </div>
    </div>
  )
}

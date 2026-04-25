import { useState } from 'react'
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
  const [history, setHistory] = useState<Page[]>(['home'])
  const [eventDraft, setEventDraft] = useState<EventDraft | null>(null)

  const page     = history[history.length - 1]
  const navigate = (p: Page) => setHistory(h => [...h, p])
  const goBack   = () => setHistory(h => h.length > 1 ? h.slice(0, -1) : h)
  const resetTo  = (p: Page) => setHistory([p])

  return (
    <div className="phone-shell">
      <div className="phone-frame">
        <div className="phone-screen">
          {page === 'home'          && <Home onNavigate={navigate} />}
          {page === 'events'           && <Events onNavigate={navigate} onBack={goBack} />}
          {page === 'your-events'      && <YourEvents onBack={goBack} onNavigate={navigate} />}
          {page === 'ai-create-event'  && <AICreateEvent onBack={goBack} onNavigate={navigate} setDraft={setEventDraft} />}
          {page === 'create-event'     && <CreateEvent onNavigate={navigate} onBack={goBack} draft={eventDraft} />}
          {page === 'event-created' && <EventCreated onNavigate={navigate} />}
          {page === 'guest-preview'      && <GuestPreview onBack={goBack} onNavigate={navigate} />}
          {page === 'buy-ticket'         && <BuyTicket onBack={goBack} onNavigate={navigate} />}
          {page === 'payment-success'    && <PaymentSuccess onBack={goBack} onNavigate={navigate} />}
          {page === 'payment-rejected'   && <PaymentRejected onBack={goBack} onNavigate={navigate} />}
          {page === 'manage-event'  && <ManageEvent onBack={goBack} onNavigate={navigate} />}
          {page === 'analytics'          && <Analytics onBack={goBack} onNavigate={navigate} />}
          {page === 'customer-insights'  && <CustomerInsights onBack={goBack} />}
          {page === 'transaction-history' && <TransactionHistory onBack={goBack} />}
          {page === 'cards'         && <Placeholder title="Cards" />}
          {page === 'savings'       && <Placeholder title="Savings" />}
          {page === 'stocks'        && <Agent />}
          {page === 'crypto'        && <Placeholder title="Crypto" />}
        </div>
        <BottomNav active={page} onChange={resetTo} />
      </div>
    </div>
  )
}

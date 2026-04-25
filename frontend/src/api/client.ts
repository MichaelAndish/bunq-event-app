export const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

async function multipart<T>(path: string, body: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

type Transaction = {
  id: string
  amount: string
  currency: string
  description: string
  counterparty: string
  createdAt: string
}

type EventRow = {
  id: string
  name: string
  date: string
  location: string
  description: string
  status: 'draft' | 'live' | 'archived'
  bannerUrl: string | null
  mediaUrls: string[]
  createdAt: string
}

type TicketRow = {
  id: string
  tierId: string
  buyerName: string
  buyerEmail: string
  paymentStatus: 'pending' | 'paid' | 'failed'
  bunqPaymentId: string | null
  purchasedAt: string
  tier:  { id: string; name: string; price: string; currency: string }
  event: { id: string; name: string; date: string; location: string }
}

export type { Transaction, EventRow, TicketRow }

export const api = {
  health: () =>
    request<{ status: string; service: string }>('/health'),

  clientStatus: () =>
    request<{ connected: boolean; mock: boolean; baseUrl: string; userId: string; accountId: string; displayName: string }>('/client/status'),

  clientBalance: (userId: string, accountId: string) =>
    request<{ balance: string; currency: string; name: string; displayName: string }>(
      `/client/balance?userId=${encodeURIComponent(userId)}&accountId=${encodeURIComponent(accountId)}`
    ),

  clientTransactions: (userId: string, accountId: string, count = 10) =>
    request<Transaction[]>(
      `/client/transactions?userId=${encodeURIComponent(userId)}&accountId=${encodeURIComponent(accountId)}&count=${count}`
    ),

  agentStatus: () =>
    request<{ aiAvailable: boolean; mock: boolean; agents: string[]; workflows: string[]; studio: string }>('/agent/status'),

  runAgent: (body: object) =>
    request<{ status: string; runId: string }>('/agent/run', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listEvents: () =>
    request<EventRow[]>('/events'),

  getEvent: (id: string) =>
    request<EventRow & { tiers: { id: string; name: string; price: string; currency: string }[] }>(`/events/${id}`),

  createEvent: (formData: FormData) =>
    multipart<EventRow & { tiers: { id: string; name: string; price: string; currency: string }[] }>('/events', formData),

  updateEvent: (id: string, body: Partial<{ name: string; date: string; location: string; description: string; status: string; ticketTiers: { id?: string; name: string; price: string; currency: string }[] }>) =>
    request<EventRow & { tiers: { id: string; name: string; price: string; currency: string }[] }>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  createTicket: (tierId: string, buyerName: string, buyerEmail: string) =>
    request<TicketRow>('/tickets', {
      method: 'POST',
      body: JSON.stringify({ tierId, buyerName, buyerEmail }),
    }),

  getTicket: (id: string) =>
    request<TicketRow>(`/tickets/${id}`),

  getEventStats: (id: string) =>
    request<{
      event: EventRow;
      tiers: Array<{
        id: string; name: string; price: string; currency: string;
        capacity: number | null; sold: number; remaining: number | null;
        actualRevenue: string; projectedRevenue: string | null;
      }>;
      summary: {
        totalSold: number;
        totalActualRevenue: string;
        totalCapacity: number | null;
        totalProjectedRevenue: string | null;
      };
    }>(`/events/${id}/stats`),
}

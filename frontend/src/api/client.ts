const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
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

export type { Transaction }

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
    request<{ agents_running: number; model_loaded: boolean; note: string }>('/agent/status'),

  runAgent: (body: object) =>
    request<{ task_id: string | null; status: string }>('/agent/run', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

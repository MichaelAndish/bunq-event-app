const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export const api = {
  health: () =>
    request<{ status: string; service: string }>('/health'),

  clientStatus: () =>
    request<{ connected: boolean; base_url: string; note: string }>('/client/status'),

  agentStatus: () =>
    request<{ agents_running: number; model_loaded: boolean; note: string }>('/agent/status'),

  runAgent: (body: object) =>
    request<{ task_id: string | null; status: string }>('/agent/run', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

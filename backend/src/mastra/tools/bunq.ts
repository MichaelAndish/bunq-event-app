import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { config } from '../../config'

function bunqAuthToken(): string {
  const t = (config.BUNQ_SESSION_TOKEN || config.BUNQ_API_KEY).trim()
  if (!t) throw new Error('Bunq not configured — run: make provision')
  return t
}

async function bunqRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = bunqAuthToken()
  const res = await fetch(`${config.BUNQ_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Bunq-Client-Authentication': token,
      'Cache-Control': 'no-cache',
      'X-Bunq-Language': 'en_US',
      'X-Bunq-Region':   'nl_NL',
      'User-Agent':      'bunq-events-app/1.0',
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`Bunq API error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

export const bunqGetBalanceTool = createTool({
  id:          'bunq-get-balance',
  description: 'Fetch the monetary account balance from Bunq',
  inputSchema: z.object({
    userId:    z.string().describe('Bunq user ID'),
    accountId: z.string().describe('Monetary account ID'),
  }),
  outputSchema: z.object({
    balance:     z.string(),
    currency:    z.string(),
    name:        z.string(),
    displayName: z.string(),
  }),
  execute: async (inputData) => {
    if (config.BUNQ_USE_MOCK) return { balance: '383000.00', currency: 'EUR', name: 'Main Account', displayName: 'Big Money Festivals B.V.' }
    const data = await bunqRequest<any>(
      `/user/${inputData.userId}/monetary-account-bank/${inputData.accountId}`
    )
    const account = data.Response[0].MonetaryAccountBank
    return {
      balance:     account.balance.value,
      currency:    account.balance.currency,
      name:        account.description ?? 'Bank Account',
      displayName: account.display_name ?? '',
    }
  },
})

export const bunqGetTransactionsTool = createTool({
  id:          'bunq-get-transactions',
  description: 'Fetch recent payments from a Bunq monetary account',
  inputSchema: z.object({
    userId:    z.string(),
    accountId: z.string(),
    count:     z.number().int().min(1).max(200).default(10),
  }),
  outputSchema: z.array(z.object({
    id:           z.string(),
    amount:       z.string(),
    currency:     z.string(),
    description:  z.string(),
    counterparty: z.string(),
    createdAt:    z.string(),
  })),
  execute: async (inputData) => {
    if (config.BUNQ_USE_MOCK) {
      return [
        { id: '1', amount: '69.00',  currency: 'EUR', description: 'General Admission – Neon Nights', counterparty: 'Alex Rivera',   createdAt: new Date().toISOString() },
        { id: '2', amount: '420.00', currency: 'EUR', description: 'VIP Table – Neon Nights',         counterparty: 'Maya Kim',      createdAt: new Date().toISOString() },
        { id: '3', amount: '69.00',  currency: 'EUR', description: 'General Admission – Neon Nights', counterparty: 'Jordan Davis',  createdAt: new Date().toISOString() },
      ]
    }
    const data = await bunqRequest<any>(
      `/user/${inputData.userId}/monetary-account/${inputData.accountId}/payment?count=${inputData.count}`
    )
    return data.Response.map((r: any) => {
      const p = r.Payment
      return {
        id:           String(p.id),
        amount:       p.amount.value,
        currency:     p.amount.currency,
        description:  p.description,
        counterparty: p.counterparty_alias?.display_name ?? 'Unknown',
        createdAt:    p.created,
      }
    })
  },
})

export const bunqCreatePaymentRequestTool = createTool({
  id:          'bunq-create-payment-request',
  description: 'Create a Bunq payment request for a ticket purchase',
  inputSchema: z.object({
    userId:         z.string(),
    accountId:      z.string(),
    amount:         z.string().describe('Decimal amount, e.g. "69.00"'),
    currency:       z.enum(['EUR', 'USD', 'GBP']).default('EUR'),
    description:    z.string(),
    recipientEmail: z.string().email(),
  }),
  outputSchema: z.object({
    paymentRequestId: z.string(),
    shareUrl:         z.string(),
  }),
  execute: async (inputData) => {
    if (config.BUNQ_USE_MOCK) {
      return { paymentRequestId: `mock-${Date.now()}`, shareUrl: 'https://bunq.me/placeholder' }
    }
    const data = await bunqRequest<any>(
      `/user/${inputData.userId}/monetary-account/${inputData.accountId}/payment-request`,
      {
        method: 'POST',
        body: JSON.stringify({
          amount_inquired:    { value: inputData.amount, currency: inputData.currency },
          counterparty_alias: { type: 'EMAIL', value: inputData.recipientEmail },
          description:        inputData.description,
          allow_bunqme:       true,
        }),
      }
    )
    return {
      paymentRequestId: String(data.Response[0].Id.id),
      shareUrl:         data.Response[0].PaymentRequest?.bunqme_share_url ?? '',
    }
  },
})

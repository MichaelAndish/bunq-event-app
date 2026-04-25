import { Hono } from 'hono'
import { config } from '../config'
import { bunqGetBalanceTool, bunqGetTransactionsTool } from '../mastra/tools/bunq'

const router = new Hono()

// GET /client/status — Bunq API connectivity check
router.get('/status', async (c) => {
  const ids = { userId: config.BUNQ_USER_ID, accountId: config.BUNQ_DEFAULT_MONETARY_ACCOUNT_ID, displayName: config.BUNQ_DISPLAY_NAME }

  if (config.BUNQ_USE_MOCK) {
    return c.json({ connected: true, mock: true, baseUrl: config.BUNQ_API_BASE_URL, ...ids })
  }

  const configured = Boolean((config.BUNQ_SESSION_TOKEN || config.BUNQ_API_KEY).trim())
  if (!configured) {
    return c.json({ connected: false, mock: false, baseUrl: config.BUNQ_API_BASE_URL, ...ids })
  }

  try {
    const auth = (config.BUNQ_SESSION_TOKEN || config.BUNQ_API_KEY).trim()
    const res = await fetch(`${config.BUNQ_API_BASE_URL}/installation`, {
      method: 'GET',
      headers: { 'X-Bunq-Client-Authentication': auth, 'Cache-Control': 'no-cache' },
    })
    return c.json({ connected: res.ok, mock: false, baseUrl: config.BUNQ_API_BASE_URL, ...ids })
  } catch {
    return c.json({ connected: false, mock: false, baseUrl: config.BUNQ_API_BASE_URL, ...ids }, 502)
  }
})

// GET /client/balance?userId=&accountId=
router.get('/balance', async (c) => {
  const userId    = c.req.query('userId')
  const accountId = c.req.query('accountId')
  if (!config.BUNQ_USE_MOCK && (!userId || !accountId)) {
    return c.json({ error: 'userId and accountId are required' }, 400)
  }

  try {
    const result = await bunqGetBalanceTool.execute!({ userId: userId ?? '', accountId: accountId ?? '' }, {} as any)
    return c.json(result)
  } catch (err: any) {
    return c.json({ error: err.message }, 502)
  }
})

// GET /client/transactions?userId=&accountId=&count=
router.get('/transactions', async (c) => {
  const userId    = c.req.query('userId')
  const accountId = c.req.query('accountId')
  if (!config.BUNQ_USE_MOCK && (!userId || !accountId)) {
    return c.json({ error: 'userId and accountId are required' }, 400)
  }

  const count = Number(c.req.query('count') ?? 10)
  try {
    const result = await bunqGetTransactionsTool.execute!({ userId: userId ?? '', accountId: accountId ?? '', count }, {} as any)
    return c.json(result)
  } catch (err: any) {
    return c.json({ error: err.message }, 502)
  }
})

export default router

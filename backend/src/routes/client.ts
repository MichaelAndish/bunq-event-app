import { Hono } from 'hono'
import { config } from '../config'
import { bunqGetBalanceTool, bunqGetTransactionsTool } from '../mastra/tools/bunq'

const router = new Hono()

// GET /client/status — Bunq API connectivity check
router.get('/status', async (c) => {
  const configured = Boolean(config.BUNQ_API_KEY)
  if (!configured) {
    return c.json({
      connected: false,
      baseUrl:   config.BUNQ_API_BASE_URL,
      note:      'Set BUNQ_API_KEY in .env to enable live Bunq data',
    })
  }

  try {
    const res = await fetch(`${config.BUNQ_API_BASE_URL}/installation`, {
      method: 'GET',
      headers: { 'X-Bunq-Client-Authentication': config.BUNQ_API_KEY },
    })
    return c.json({ connected: res.ok, baseUrl: config.BUNQ_API_BASE_URL })
  } catch {
    return c.json({ connected: false, baseUrl: config.BUNQ_API_BASE_URL }, 502)
  }
})

// GET /client/balance?userId=&accountId=
router.get('/balance', async (c) => {
  const userId    = c.req.query('userId')    ?? 'placeholder'
  const accountId = c.req.query('accountId') ?? 'placeholder'

  try {
    const result = await bunqGetBalanceTool.execute!({
      context: { userId, accountId },
      runId: '',
      mastra: undefined as any,
    })
    return c.json(result)
  } catch (err: any) {
    return c.json({ error: err.message }, 502)
  }
})

// GET /client/transactions?userId=&accountId=&count=
router.get('/transactions', async (c) => {
  const userId    = c.req.query('userId')    ?? 'placeholder'
  const accountId = c.req.query('accountId') ?? 'placeholder'
  const count     = Number(c.req.query('count') ?? 10)

  try {
    const result = await bunqGetTransactionsTool.execute!({
      context: { userId, accountId, count },
      runId: '',
      mastra: undefined as any,
    })
    return c.json(result)
  } catch (err: any) {
    return c.json({ error: err.message }, 502)
  }
})

export default router

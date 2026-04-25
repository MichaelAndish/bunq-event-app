import { Hono } from 'hono'
import { pool } from '../db/client'
import { config } from '../config'

const router = new Hono()

router.get('/', async (c) => {
  let dbStatus = 'ok'
  try {
    await pool.query('SELECT 1')
  } catch {
    dbStatus = 'unreachable'
  }

  return c.json({
    status:  dbStatus === 'ok' ? 'ok' : 'degraded',
    service: 'bunq-backend',
    env:     config.NODE_ENV,
    db:      dbStatus,
    ai:      config.ANTHROPIC_API_KEY ? 'configured' : 'missing key',
    bunq:    (config.BUNQ_SESSION_TOKEN || config.BUNQ_API_KEY) ? 'configured' : 'missing key',
  })
})

export default router

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { config } from './config'
import { runMigrations } from './db/migrate'
import { ensureBucket } from './storage/client'
import healthRouter      from './routes/health'
import eventsRouter      from './routes/events'
import agentRouter       from './routes/agent'
import clientRouter      from './routes/client'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({ origin: config.FRONTEND_ORIGIN, allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }))

app.route('/health',         healthRouter)
app.route('/events',         eventsRouter)
app.route('/agent',          agentRouter)
app.route('/client',         clientRouter)

app.notFound(c => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message ?? 'Internal server error' }, 500)
})

async function main() {
  try {
    await runMigrations()
  } catch (err) {
    console.error('Migration failed — check DATABASE_URL:', err)
    process.exit(1)
  }

  try {
    await ensureBucket()
  } catch (err) {
    console.warn('⚠️  Storage bucket setup failed (uploads will not work):', err)
  }

  serve({ fetch: app.fetch, port: config.PORT }, () => {
    console.log(`🚀  bunq backend running on port ${config.PORT}`)
    console.log(`    AI:      ${config.ANTHROPIC_API_KEY ? '✅ ready' : '⚠️  no key (using mock)'}`)
    console.log(`    Bunq:    ${(config.BUNQ_SESSION_TOKEN || config.BUNQ_API_KEY) ? '✅ ready' : '⚠️  no key (using mock)'}`)
    console.log(`    Storage: ${config.STORAGE_ENDPOINT || 'AWS S3'} → bucket "${config.STORAGE_BUCKET}"`)
  })
}

main()

import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV:            z.enum(['development', 'production', 'test']).default('development'),
  PORT:                z.coerce.number().default(9191),
  DATABASE_URL:        z.string().url('DATABASE_URL must be a valid connection string'),
  ANTHROPIC_API_KEY:   z.string().default(''),
  BUNQ_API_KEY:        z.string().default(''),
  BUNQ_API_BASE_URL:   z.string().url().default('https://public-api.sandbox.bunq.com/v1'),
  FRONTEND_ORIGIN:     z.string().default('http://localhost:9292'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌  Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data

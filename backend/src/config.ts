import { config as loadEnv } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { z } from 'zod'

const parentEnv = resolve(process.cwd(), '..', '.env')
const localEnv = resolve(process.cwd(), '.env')
if (existsSync(parentEnv)) loadEnv({ path: parentEnv })
if (existsSync(localEnv)) loadEnv({ path: localEnv, override: true })
if (!existsSync(parentEnv) && !existsSync(localEnv)) loadEnv()

const schema = z.object({
  NODE_ENV:            z.enum(['development', 'production', 'test']).default('development'),
  PORT:                z.coerce.number().default(9191),
  DATABASE_URL:        z.string().url('DATABASE_URL must be a valid connection string'),
  ANTHROPIC_API_KEY:   z.string().default(''),
  MASTRA_MODEL:        z.string().default('claude-sonnet-4-6'),
  MASTRA_FAST_MODEL:   z.string().default('claude-haiku-4-5'),
  BUNQ_USE_MOCK:       z.preprocess(v => String(v) === 'true', z.boolean()).default(false),
  BUNQ_API_KEY:        z.string().default(''),
  BUNQ_API_BASE_URL:   z.string().url().default('https://public-api.sandbox.bunq.com/v1'),
  /** Session token from POST /session-server (use `npm run bunq:provision` in sandbox). Expires; refresh with script --refresh-session. */
  BUNQ_SESSION_TOKEN:  z.string().default(''),
  BUNQ_USER_ID:        z.string().default(''),
  BUNQ_DEFAULT_MONETARY_ACCOUNT_ID: z.string().default(''),
  BUNQ_DISPLAY_NAME:   z.string().default(''),
  BUNQ_INSTALLATION_TOKEN: z.string().default(''),
  BUNQ_PRIVATE_KEY_PATH:   z.string().default(''),
  BUNQ_PUBLIC_KEY_PATH:    z.string().default(''),
  BUNQ_SERVER_PUBLIC_KEY_PATH: z.string().default(''),
  /**
   * Optional inline PEM; prefer BUNQ_PRIVATE_KEY_PATH.
   * When passed via App Runner env vars the PEM must have real newlines replaced
   * with the two-character sequence \n — this preprocessor restores them.
   */
  BUNQ_PRIVATE_KEY: z.preprocess(
    v => typeof v === 'string' ? v.replace(/\\n/g, '\n') : v,
    z.string().default(''),
  ),
  FRONTEND_ORIGIN:     z.string().default('http://localhost:9292'),

  // Storage — MinIO locally, S3 in production.
  // Set STORAGE_ENDPOINT to empty string to use AWS S3 defaults.
  STORAGE_ENDPOINT:         z.string().default('http://localhost:9000'),
  STORAGE_BUCKET:           z.string().default('bunq-events'),
  STORAGE_ACCESS_KEY:       z.string().default('minioadmin'),
  STORAGE_SECRET_KEY:       z.string().default('minioadmin'),
  STORAGE_REGION:           z.string().default('us-east-1'),
  STORAGE_PUBLIC_URL:       z.string().default('http://localhost:9000/bunq-events'),
  STORAGE_FORCE_PATH_STYLE: z.preprocess(v => String(v) !== 'false', z.boolean()).default(true),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌  Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data

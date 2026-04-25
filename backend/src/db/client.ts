import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { config } from '../config'
import * as schema from './schema'

// Enable SSL for RDS (any host that is not localhost/127.0.0.1/db).
// rejectUnauthorized:false trusts Amazon's RDS CA without bundling the cert.
const isRds = !/localhost|127\.0\.0\.1|^db$/.test(
  new URL(config.DATABASE_URL).hostname,
)

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ...(isRds ? { ssl: { rejectUnauthorized: false } } : {}),
})
export const db = drizzle(pool, { schema })


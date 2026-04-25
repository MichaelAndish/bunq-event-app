import { pool } from './client'

export async function runMigrations(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Enums — use DO blocks so re-runs are idempotent
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE event_status AS ENUM ('draft', 'live', 'archived');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE currency AS ENUM ('EUR', 'USD', 'GBP');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT         NOT NULL,
        date        TEXT         NOT NULL,
        location    TEXT         NOT NULL,
        description TEXT         DEFAULT '',
        banner_url  TEXT,
        status      event_status DEFAULT 'draft',
        created_at  TIMESTAMPTZ  DEFAULT NOW()
      );

      -- Idempotent column additions
      ALTER TABLE events ADD COLUMN IF NOT EXISTS creator_id UUID;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

      CREATE TABLE IF NOT EXISTS ticket_tiers (
        id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id  UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name      TEXT    NOT NULL,
        price     NUMERIC(10,2) NOT NULL,
        currency  currency DEFAULT 'EUR',
        quantity  INTEGER
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
        tier_id         UUID           NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
        buyer_name      TEXT           NOT NULL,
        buyer_email     TEXT           NOT NULL,
        payment_status  payment_status DEFAULT 'pending',
        bunq_payment_id TEXT,
        purchased_at    TIMESTAMPTZ    DEFAULT NOW()
      );
    `)

    await client.query('COMMIT')
    console.log('✅  Migrations applied')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

import { createHash } from 'crypto'
import { db } from './client'
import { events, ticketTiers } from './schema'
import { eq } from 'drizzle-orm'

// Derive a deterministic UUID v5-like ID from a seed string so re-runs are idempotent.
function deterministicId(seed: string): string {
  const hash = createHash('sha256').update(seed).digest('hex')
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),  // version 4 marker
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join('-')
}

type SeedEvent = {
  id:          string
  name:        string
  date:        string
  location:    string
  description: string
  status:      'draft' | 'live' | 'archived'
  tiers: { name: string; price: string; currency: 'EUR' | 'USD' | 'GBP'; quantity?: number }[]
}

const SEED_EVENTS: SeedEvent[] = [
  {
    id:          deterministicId('event:neon-nights-berlin-2026'),
    name:        'Neon Nights Berlin',
    date:        'Sat, 14 Jun • 22:00',
    location:    'Tresor, Berlin',
    description: 'An electric night of underground techno across three floors of Tresor\'s iconic industrial space. Expect world-class DJs, laser installations, and the pulse of Berlin\'s best club culture.',
    status:      'live',
    tiers: [
      { name: 'Early Bird',      price: '15.00', currency: 'EUR', quantity: 100 },
      { name: 'General Admission', price: '25.00', currency: 'EUR', quantity: 300 },
      { name: 'VIP Access',      price: '120.00', currency: 'EUR', quantity: 20 },
    ],
  },
  {
    id:          deterministicId('event:rooftop-sessions-amsterdam-2026'),
    name:        'Rooftop Sessions Amsterdam',
    date:        'Sun, 6 Jul • 15:00',
    location:    'W Amsterdam Rooftop, Amsterdam',
    description: 'Sunday afternoon house music overlooking the canals. Craft cocktails, premium sound, and a crowd that knows their music — the perfect end to your weekend.',
    status:      'live',
    tiers: [
      { name: 'Afternoon Pass',  price: '35.00', currency: 'EUR', quantity: 150 },
      { name: 'Premium Lounger', price: '95.00', currency: 'EUR', quantity: 30 },
      { name: 'Skybox Table',    price: '500.00', currency: 'EUR', quantity: 5 },
    ],
  },
]

export async function runSeed(): Promise<void> {
  for (const seed of SEED_EVENTS) {
    const existing = await db.select({ id: events.id }).from(events).where(eq(events.id, seed.id))
    if (existing.length > 0) {
      console.log(`  ⏭  Seed event "${seed.name}" already exists — skipping`)
      continue
    }

    await db.insert(events).values({
      id:          seed.id,
      name:        seed.name,
      date:        seed.date,
      location:    seed.location,
      description: seed.description,
      status:      seed.status,
    })

    await db.insert(ticketTiers).values(
      seed.tiers.map(t => ({
        eventId:  seed.id,
        name:     t.name,
        price:    t.price,
        currency: t.currency,
        quantity: t.quantity ?? null,
      }))
    )

    console.log(`  ✅  Seeded event "${seed.name}" (${seed.tiers.length} tiers)`)
  }
}

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { events, ticketTiers } from '../db/schema'

const router = new Hono()

const CreateEventSchema = z.object({
  name:        z.string().min(1),
  date:        z.string().min(1),
  location:    z.string().min(1),
  description: z.string().default(''),
  tiers: z.array(z.object({
    name:     z.string().min(1),
    price:    z.string().min(1),
    currency: z.enum(['EUR', 'USD', 'GBP']).default('EUR'),
  })).default([]),
})

const UpdateEventSchema = CreateEventSchema.partial().extend({
  status: z.enum(['draft', 'live', 'archived']).optional(),
})

// GET /events — list all events
router.get('/', async (c) => {
  const rows = await db.select().from(events).orderBy(events.createdAt)
  return c.json(rows)
})

// GET /events/:id — event + its tiers
router.get('/:id', async (c) => {
  const id = c.req.param('id')
  const [event] = await db.select().from(events).where(eq(events.id, id))
  if (!event) return c.json({ error: 'Event not found' }, 404)

  const tiers = await db.select().from(ticketTiers).where(eq(ticketTiers.eventId, id))
  return c.json({ ...event, tiers })
})

// POST /events — create event + tiers
router.post('/', zValidator('json', CreateEventSchema), async (c) => {
  const body = c.req.valid('json')

  const [event] = await db.insert(events).values({
    name:        body.name,
    date:        body.date,
    location:    body.location,
    description: body.description,
  }).returning()

  if (body.tiers.length > 0) {
    await db.insert(ticketTiers).values(
      body.tiers.map(t => ({
        eventId:  event.id,
        name:     t.name,
        price:    t.price.replace(/[^0-9.]/g, ''),
        currency: t.currency,
      }))
    )
  }

  const tiers = await db.select().from(ticketTiers).where(eq(ticketTiers.eventId, event.id))
  return c.json({ ...event, tiers }, 201)
})

// PUT /events/:id — partial update
router.put('/:id', zValidator('json', UpdateEventSchema), async (c) => {
  const id   = c.req.param('id')
  const body = c.req.valid('json')

  const { tiers, ...fields } = body

  if (Object.keys(fields).length > 0) {
    await db.update(events).set(fields).where(eq(events.id, id))
  }

  if (tiers !== undefined) {
    await db.delete(ticketTiers).where(eq(ticketTiers.eventId, id))
    if (tiers.length > 0) {
      await db.insert(ticketTiers).values(
        tiers.map(t => ({
          eventId:  id,
          name:     t.name,
          price:    t.price.replace(/[^0-9.]/g, ''),
          currency: t.currency,
        }))
      )
    }
  }

  const [updated] = await db.select().from(events).where(eq(events.id, id))
  if (!updated) return c.json({ error: 'Event not found' }, 404)
  const updatedTiers = await db.select().from(ticketTiers).where(eq(ticketTiers.eventId, id))
  return c.json({ ...updated, tiers: updatedTiers })
})

// DELETE /events/:id
router.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(events).where(eq(events.id, id))
  return c.body(null, 204)
})

export default router

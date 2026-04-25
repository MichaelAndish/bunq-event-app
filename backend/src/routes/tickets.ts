import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq, ne, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { tickets, ticketTiers, events } from '../db/schema'

const router = new Hono()

const CreateTicketSchema = z.object({
  tierId:     z.string().uuid(),
  buyerName:  z.string().min(1),
  buyerEmail: z.string().email(),
})

async function enrichTicket(ticket: typeof tickets.$inferSelect) {
  const [tier]  = await db.select().from(ticketTiers).where(eq(ticketTiers.id, ticket.tierId))
  const [event] = await db.select().from(events).where(eq(events.id, tier.eventId))
  return {
    ...ticket,
    tier:  { id: tier.id,   name: tier.name,   price: tier.price,   currency: tier.currency },
    event: { id: event.id,  name: event.name,  date: event.date,   location: event.location },
  }
}

// POST /tickets — purchase a ticket for a tier (marks as paid immediately for demo flow)
router.post('/', zValidator('json', CreateTicketSchema), async (c) => {
  const { tierId, buyerName, buyerEmail } = c.req.valid('json')

  const [tier] = await db.select().from(ticketTiers).where(eq(ticketTiers.id, tierId))
  if (!tier) return c.json({ error: 'Ticket tier not found' }, 404)

  // Capacity check — count pending + paid tickets (exclude failed)
  if (tier.quantity !== null) {
    const [{ sold }] = await db
      .select({ sold: sql<number>`count(*)::int` })
      .from(tickets)
      .where(and(eq(tickets.tierId, tierId), ne(tickets.paymentStatus, 'failed')))
    if (sold >= tier.quantity) {
      return c.json({ error: 'This ticket tier is sold out' }, 409)
    }
  }

  const [ticket] = await db.insert(tickets).values({
    tierId,
    buyerName,
    buyerEmail,
    paymentStatus: 'paid',
  }).returning()

  return c.json(await enrichTicket(ticket), 201)
})

// GET /tickets/:id — fetch ticket with tier and event details
router.get('/:id', async (c) => {
  const id = c.req.param('id')
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id))
  if (!ticket) return c.json({ error: 'Ticket not found' }, 404)
  return c.json(await enrichTicket(ticket))
})

export default router

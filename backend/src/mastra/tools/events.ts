import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { db } from '../../db/client'
import { events, ticketTiers } from '../../db/schema'
import { eq } from 'drizzle-orm'

export const createEventTool = createTool({
  id: 'create-event',
  description: 'Persist a new event and its ticket tiers to the database',
  inputSchema: z.object({
    name:        z.string(),
    date:        z.string(),
    location:    z.string(),
    description: z.string().default(''),
    tiers: z.array(z.object({
      name:     z.string(),
      price:    z.string(),
      currency: z.enum(['EUR', 'USD', 'GBP']).default('EUR'),
    })),
  }),
  outputSchema: z.object({ eventId: z.string() }),
  execute: async ({ context }) => {
    const [event] = await db.insert(events).values({
      name:        context.name,
      date:        context.date,
      location:    context.location,
      description: context.description,
    }).returning({ id: events.id })

    if (context.tiers.length > 0) {
      await db.insert(ticketTiers).values(
        context.tiers.map(t => ({
          eventId:  event.id,
          name:     t.name,
          price:    t.price.replace(/[^0-9.]/g, ''),
          currency: t.currency,
        }))
      )
    }

    return { eventId: event.id }
  },
})

export const getEventTool = createTool({
  id: 'get-event',
  description: 'Fetch an event with its ticket tiers from the database',
  inputSchema: z.object({ eventId: z.string().uuid() }),
  outputSchema: z.object({
    event: z.any(),
    tiers: z.array(z.any()),
  }),
  execute: async ({ context }) => {
    const [event] = await db.select().from(events).where(eq(events.id, context.eventId))
    const tiers   = await db.select().from(ticketTiers).where(eq(ticketTiers.eventId, context.eventId))
    return { event, tiers }
  },
})

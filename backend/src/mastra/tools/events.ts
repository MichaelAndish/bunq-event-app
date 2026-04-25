import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { db } from '../../db/client'
import { events, ticketTiers } from '../../db/schema'
import { parsePrice } from '../../db/price'
import { eq } from 'drizzle-orm'

export const createEventTool = createTool({
  id:          'create-event',
  description: 'Persist a new event and its ticket tiers to the database',
  inputSchema: z.object({
    name:        z.string(),
    date:        z.string(),
    location:    z.string(),
    description: z.string().default(''),
    creatorId:   z.string().uuid().optional(),
    bannerUrl:   z.string().optional(),
    tiers: z.array(z.object({
      name:     z.string(),
      price:    z.string(),
      currency: z.enum(['EUR', 'USD', 'GBP']).default('EUR'),
    })),
  }),
  outputSchema: z.object({ eventId: z.string() }),
  execute: async (inputData) => {
    const [event] = await db.insert(events).values({
      name:        inputData.name,
      date:        inputData.date,
      location:    inputData.location,
      description: inputData.description,
      creatorId:   inputData.creatorId,
      bannerUrl:   inputData.bannerUrl,
    }).returning({ id: events.id })

    if (inputData.tiers.length > 0) {
      await db.insert(ticketTiers).values(
        inputData.tiers.map((t: { name: string; price: string; currency: 'EUR' | 'USD' | 'GBP' }) => ({
          eventId:  event.id,
          name:     t.name,
          price:    parsePrice(t.price),
          currency: t.currency,
        }))
      )
    }

    return { eventId: event.id }
  },
})

export const getEventTool = createTool({
  id:          'get-event',
  description: 'Fetch an event with its ticket tiers from the database',
  inputSchema:  z.object({ eventId: z.string().uuid() }),
  outputSchema: z.object({ event: z.record(z.unknown()), tiers: z.array(z.record(z.unknown())) }),
  execute: async (inputData) => {
    const [event] = await db.select().from(events).where(eq(events.id, inputData.eventId))
    const tiers   = await db.select().from(ticketTiers).where(eq(ticketTiers.eventId, inputData.eventId))
    return { event, tiers }
  },
})

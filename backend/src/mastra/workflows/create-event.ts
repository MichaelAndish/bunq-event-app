import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { EventDraftSchema } from '../agents/venue'
import { db } from '../../db/client'
import { events, ticketTiers } from '../../db/schema'

// Step 1: validate and normalise the AI draft
const validateDraftStep = createStep({
  id: 'validate-draft',
  description: 'Validate and normalise the event draft from the venue agent',
  inputSchema:  EventDraftSchema,
  outputSchema: EventDraftSchema,
  execute: async ({ inputData }) => ({
    ...inputData,
    ticketTiers: inputData.ticketTiers.map((t, i) => ({
      ...t,
      id: t.id || `tier-${i}`,
    })),
  }),
})

// Step 2: persist to PostgreSQL
const persistEventStep = createStep({
  id: 'persist-event',
  description: 'Save the validated event and ticket tiers to the database',
  inputSchema:  EventDraftSchema,
  outputSchema: z.object({ eventId: z.string().uuid() }),
  execute: async ({ inputData }) => {
    const [event] = await db.insert(events).values({
      name:        inputData.name,
      date:        inputData.date,
      location:    inputData.location,
      description: inputData.description,
    }).returning({ id: events.id })

    if (inputData.ticketTiers.length > 0) {
      await db.insert(ticketTiers).values(
        inputData.ticketTiers.map(t => ({
          eventId:  event.id,
          name:     t.name,
          price:    t.price.replace(/[^0-9.]/g, ''),
          currency: 'EUR' as const,
        }))
      )
    }

    return { eventId: event.id }
  },
})

// Workflow: validate → persist
export const createEventWorkflow = createWorkflow({
  id:           'create-event',
  inputSchema:  EventDraftSchema,
  outputSchema: z.object({ eventId: z.string().uuid() }),
})
  .then(validateDraftStep)
  .then(persistEventStep)
  .commit()

import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { EventDraftSchema } from '../schemas/event'
import { db } from '../../db/client'
import { events, ticketTiers } from '../../db/schema'
import { parsePrice } from '../../db/price'

const WorkflowInputSchema = EventDraftSchema.extend({
  creatorId: z.string().uuid().optional(),
  bannerUrl: z.string().optional(),
})

const validateDraftStep = createStep({
  id:           'validate-draft',
  description:  'Validate and normalise the event draft',
  inputSchema:  WorkflowInputSchema,
  outputSchema: WorkflowInputSchema,
  execute: async ({ inputData }) => ({
    ...inputData,
    ticketTiers: inputData.ticketTiers.map((t, i) => ({
      ...t,
      id: t.id || `tier-${i}`,
    })),
  }),
})

const persistEventStep = createStep({
  id:           'persist-event',
  description:  'Save the validated event and ticket tiers to the database',
  inputSchema:  WorkflowInputSchema,
  outputSchema: z.object({ eventId: z.string().uuid() }),
  execute: async ({ inputData }) => {
    const [event] = await db.insert(events).values({
      name:        inputData.name,
      date:        inputData.date,
      location:    inputData.location,
      description: inputData.description,
      creatorId:   inputData.creatorId,
      bannerUrl:   inputData.bannerUrl,
    }).returning({ id: events.id })

    if (inputData.ticketTiers.length > 0) {
      await db.insert(ticketTiers).values(
        inputData.ticketTiers.map(t => ({
          eventId:  event.id,
          name:     t.name,
          price:    parsePrice(t.price),
          currency: 'EUR' as const,
        }))
      )
    }

    return { eventId: event.id }
  },
})

export const createEventWorkflow = createWorkflow({
  id:           'create-event',
  inputSchema:  WorkflowInputSchema,
  outputSchema: z.object({ eventId: z.string().uuid() }),
})
  .then(validateDraftStep)
  .then(persistEventStep)
  .commit()

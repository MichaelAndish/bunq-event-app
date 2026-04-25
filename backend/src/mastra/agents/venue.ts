import { Agent } from '@mastra/core/agent'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { createEventTool } from '../tools/events'

export const EventDraftSchema = z.object({
  name:        z.string().describe('Event name'),
  date:        z.string().describe('Human-friendly date, e.g. "Sat, 25 Apr • 14:00"'),
  location:    z.string().describe('City and country or venue name'),
  description: z.string().describe('Short event description, 1-2 sentences'),
  ticketTiers: z.array(z.object({
    id:    z.string(),
    name:  z.string(),
    price: z.string().describe('Price with currency symbol, e.g. "€25.00"'),
  })).min(1),
})

export type EventDraft = z.infer<typeof EventDraftSchema>

const INSTRUCTIONS = `You are an event-setup assistant for bunq, a digital bank.
Analyze the venue images and/or descriptive text the user provides and produce a
complete event draft. Be specific and creative — infer a realistic event name,
date, location, description, and 2-3 ticket tiers from what you see.
Always use € for prices unless instructed otherwise.
Format dates as human-friendly text like "Sat, 25 Apr • 20:00".`

export const venueAgent = new Agent({
  id:           'venue-analysis',
  name:         'Venue Analysis Agent',
  model:        anthropic('claude-opus-4-7'),
  instructions: INSTRUCTIONS,
  tools:        { createEventTool },
})

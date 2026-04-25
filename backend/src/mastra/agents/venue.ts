import { Agent } from '@mastra/core/agent'
import { anthropic } from '@ai-sdk/anthropic'
import { createEventTool } from '../tools/events'

// Re-export from shared schema for backwards compat
export { EventDraftSchema, type EventDraft } from '../schemas/event'

const INSTRUCTIONS = `You are an event-setup assistant for bunq, a digital bank.
Analyze the venue images and/or descriptive text the user provides and produce a
complete event draft. Be specific and creative — infer a realistic event name,
date, location, description, and 2-3 ticket tiers from what you see.
Always use € for prices unless instructed otherwise.
Format dates as human-friendly text like "Sat, 25 Apr • 20:00".`

export const venueAgent = new Agent({
  id:           'venue-analysis',
  name:         'Venue Analysis Agent',
  model:        anthropic('claude-sonnet-4-5-20250514'),
  instructions: INSTRUCTIONS,
  tools:        { createEventTool },
})

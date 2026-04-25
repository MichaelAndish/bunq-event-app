import { z } from 'zod'

export const TicketTierSchema = z.object({
  id:    z.string(),
  name:  z.string(),
  price: z.string().describe('Price with currency symbol, e.g. "€25.00"'),
})

export const EventDraftSchema = z.object({
  name:        z.string().describe('Event name'),
  date:        z.string().describe('Human-friendly date, e.g. "Sat, 25 Apr • 14:00"'),
  location:    z.string().describe('City and country or venue name'),
  description: z.string().describe('Short event description, 1-2 sentences'),
  ticketTiers: z.array(TicketTierSchema).describe('At least one ticket tier'),
})

export const ExtractionResultSchema = z.object({
  draft:      EventDraftSchema.partial(),
  confidence: z.number().describe('Confidence between 0 and 1, where 0 = nothing extracted, 1 = fully confident'),
  reasoning:  z.string().describe('Why this confidence score was given'),
})

export const EnrichedDraftSchema = EventDraftSchema.extend({
  audienceProfile: z.string().describe('Audience targeting strategy'),
  imagePrompt:     z.string().describe('Detailed image generation prompt for event banner'),
  lowConfidence:   z.boolean().optional().describe('True when extraction confidence is below threshold'),
})

export type EventDraft       = z.infer<typeof EventDraftSchema>
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>
export type EnrichedDraft    = z.infer<typeof EnrichedDraftSchema>

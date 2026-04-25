import { z } from 'zod'
import {
  ExtractionResultSchema,
  EnrichedDraftSchema,
  type EventDraft,
  type ExtractionResult,
  type EnrichedDraft,
} from './schemas/event'
import { imageExtractorAgent }       from './agents/image-extractor'
import { voiceExtractorAgent }       from './agents/voice-extractor'
import { textExtractorAgent }        from './agents/text-extractor'
import { descriptionGeneratorAgent } from './agents/description-generator'
import { priceOptimizerAgent }       from './agents/price-optimizer'
import { inviteeOptimizerAgent }     from './agents/invitee-optimizer'
import { eventImageGeneratorAgent }  from './agents/event-image-generator'

const CONFIDENCE_THRESHOLD = 0.5

// Values LLMs sometimes emit when a field is unknown — strip them out
const UNKNOWN_PLACEHOLDERS = new Set(['unknown', 'n/a', 'tbd', 'tba', 'none', 'not specified', 'to be determined'])

function isPlaceholder(v: string | undefined): boolean {
  if (!v) return false
  return UNKNOWN_PLACEHOLDERS.has(v.trim().toLowerCase())
}

type MediaInput = { buffer: ArrayBuffer; mimeType: string }

// ── Extraction helpers ────────────────────────────────────────────────────────

async function extractFromImages(images: MediaInput[]): Promise<ExtractionResult> {
  const content: any[] = images.map(img => ({
    type:     'image',
    image:    img.buffer,
    mimeType: img.mimeType,
  }))
  content.push({ type: 'text', text: 'Extract event details from these venue images.' })

  const res = await imageExtractorAgent.generate(
    [{ role: 'user', content }],
    { structuredOutput: { schema: ExtractionResultSchema } },
  )
  return (res as any).object as ExtractionResult
}

async function extractFromVoice(blobs: MediaInput[]): Promise<ExtractionResult> {
  const content: any[] = blobs.map(blob => ({
    type:     'file',
    data:     blob.buffer,
    mimeType: blob.mimeType,
  }))
  content.push({ type: 'text', text: 'Transcribe and extract event details from this audio recording.' })

  const res = await voiceExtractorAgent.generate(
    [{ role: 'user', content }],
    { structuredOutput: { schema: ExtractionResultSchema } },
  )
  return (res as any).object as ExtractionResult
}

async function extractFromText(text: string): Promise<ExtractionResult> {
  const res = await textExtractorAgent.generate(
    text,
    { structuredOutput: { schema: ExtractionResultSchema } },
  )
  return (res as any).object as ExtractionResult
}

// ── Merge strategy: highest-confidence result wins; fill gaps from others ─────

function mergeExtractions(results: ExtractionResult[]): { draft: Partial<EventDraft>; confidence: number } {
  if (results.length === 0) return { draft: {}, confidence: 0 }

  const sorted = [...results].sort((a, b) => b.confidence - a.confidence)
  const merged: Partial<EventDraft> = {}

  for (const r of sorted) {
    const d = r.draft
    if (!merged.name        && d.name        && !isPlaceholder(d.name))        merged.name        = d.name
    if (!merged.date        && d.date        && !isPlaceholder(d.date))        merged.date        = d.date
    if (!merged.location    && d.location    && !isPlaceholder(d.location))    merged.location    = d.location
    if (!merged.description && d.description && !isPlaceholder(d.description)) merged.description = d.description
    if (!merged.ticketTiers?.length && d.ticketTiers?.length)                  merged.ticketTiers = d.ticketTiers
  }

  return { draft: merged, confidence: sorted[0].confidence }
}

// ── Enrichment helpers ────────────────────────────────────────────────────────

async function generateDescription(draft: Partial<EventDraft>): Promise<{ description: string; tagline: string }> {
  const schema = z.object({ description: z.string(), tagline: z.string() })
  const res = await descriptionGeneratorAgent.generate(
    `Event details: ${JSON.stringify(draft)}`,
    { structuredOutput: { schema } },
  )
  return (res as any).object
}

async function optimizePricing(draft: Partial<EventDraft>): Promise<{ tiers: EventDraft['ticketTiers'] }> {
  const schema = z.object({ tiers: z.array(z.object({ id: z.string(), name: z.string(), price: z.string() })) })
  const res = await priceOptimizerAgent.generate(
    `Event details: ${JSON.stringify(draft)}`,
    { structuredOutput: { schema } },
  )
  return (res as any).object
}

async function generateAudienceProfile(draft: Partial<EventDraft>): Promise<{ audienceProfile: string }> {
  const schema = z.object({ audienceProfile: z.string() })
  const res = await inviteeOptimizerAgent.generate(
    `Event details: ${JSON.stringify(draft)}`,
    { structuredOutput: { schema } },
  )
  return (res as any).object
}

async function generateImagePrompt(draft: Partial<EventDraft>): Promise<{ imagePrompt: string }> {
  const schema = z.object({ imagePrompt: z.string() })
  const res = await eventImageGeneratorAgent.generate(
    `Event details: ${JSON.stringify(draft)}`,
    { structuredOutput: { schema } },
  )
  return (res as any).object
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function orchestrateEventCreation(
  images:     MediaInput[],
  voiceBlobs: MediaInput[],
  text:       string,
): Promise<EnrichedDraft> {
  // Phase 1: run applicable extractors in parallel
  const tasks: Promise<ExtractionResult>[] = []
  if (images.length > 0)     tasks.push(extractFromImages(images))
  if (voiceBlobs.length > 0) tasks.push(extractFromVoice(voiceBlobs))
  if (text.trim())           tasks.push(extractFromText(text))

  const settled    = await Promise.allSettled(tasks)
  const successful = settled
    .filter((r): r is PromiseFulfilledResult<ExtractionResult> => r.status === 'fulfilled')
    .map(r => r.value)

  if (successful.length === 0) {
    throw new Error('All extractors failed — no event information could be extracted')
  }

  // Phase 2: merge results
  const { draft: merged, confidence } = mergeExtractions(successful)
  const lowConfidence = confidence < CONFIDENCE_THRESHOLD

  // Phase 3: enrich in parallel (partial failures are non-fatal)
  const [descResult, priceResult, audienceResult, imageResult] = await Promise.allSettled([
    generateDescription(merged),
    optimizePricing(merged),
    generateAudienceProfile(merged),
    generateImagePrompt(merged),
  ])

  if (descResult.status    === 'rejected') console.warn('Description generator failed:', descResult.reason)
  if (priceResult.status   === 'rejected') console.warn('Price optimizer failed:',        priceResult.reason)
  if (audienceResult.status === 'rejected') console.warn('Audience optimizer failed:',    audienceResult.reason)
  if (imageResult.status   === 'rejected') console.warn('Image generator failed:',        imageResult.reason)

  const description = descResult.status === 'fulfilled'
    ? descResult.value.description
    : (merged.description ?? '')

  const ticketTiers = priceResult.status === 'fulfilled' && !merged.ticketTiers?.length
    ? priceResult.value.tiers
    : (merged.ticketTiers ?? [{ id: 'general', name: 'General Admission', price: '€25.00' }])

  const audienceProfile = audienceResult.status === 'fulfilled'
    ? audienceResult.value.audienceProfile
    : ''

  const imagePrompt = imageResult.status === 'fulfilled'
    ? imageResult.value.imagePrompt
    : ''

  return EnrichedDraftSchema.parse({
    name:            merged.name        ?? '',
    date:            merged.date        ?? '',
    location:        merged.location    ?? '',
    description,
    ticketTiers,
    audienceProfile,
    imagePrompt,
    lowConfidence,
  })
}

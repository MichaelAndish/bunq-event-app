import { Hono } from 'hono'
import { z } from 'zod'
import { mastra } from '../mastra'
import { EventDraftSchema, type EnrichedDraft } from '../mastra/schemas/event'
import { orchestrateEventCreation } from '../mastra/orchestrator'
import { config } from '../config'
import { uploadFile } from '../storage/client'

const router = new Hono()

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const ALLOWED_AUDIO_TYPES = new Set(['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'])
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const MAX_IMAGE_BYTES     = 10 * 1024 * 1024
const MAX_VIDEO_BYTES     = 50 * 1024 * 1024
const MAX_AUDIO_BYTES     = 25 * 1024 * 1024
const MAX_FILES           = 5

const MOCK_DRAFT: EnrichedDraft = {
  name:            'Pro Vibes – bunq demo day',
  date:            'Sat, 25 Apr • 14:00',
  location:        'bunq HQ, Amsterdam',
  description:     'An unforgettable night of music, networking, and great vibes at bunq HQ.',
  ticketTiers:     [
    { id: 'general', name: 'General Admission', price: '€25.00' },
    { id: 'vip',     name: 'VIP Table',         price: '€1000.00' },
  ],
  audienceProfile: 'Young professionals aged 25-35. Best reached via Instagram and LinkedIn.',
  imagePrompt:     'Modern office rooftop party with city lights, purple neon accents, professional crowd.',
  lowConfidence:   false,
}

// POST /agent/analyze-venue
router.post('/analyze-venue', async (c) => {
  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Expected multipart/form-data' }, 400)
  }

  const message  = (formData.get('message') as string | null)?.trim() ?? ''
  const rawFiles = formData.getAll('files') as File[]

  if (!message && rawFiles.length === 0) {
    return c.json({ error: 'Provide at least one file or a message.' }, 422)
  }

  if (rawFiles.length > MAX_FILES) {
    return c.json({ error: `Maximum ${MAX_FILES} files allowed.` }, 422)
  }

  for (const file of rawFiles) {
    const ct = file.type.toLowerCase()
    const allowed = ALLOWED_IMAGE_TYPES.has(ct) || ALLOWED_AUDIO_TYPES.has(ct) || ALLOWED_VIDEO_TYPES.has(ct)
    if (!allowed) return c.json({ error: `Unsupported file type: ${ct}` }, 422)

    const limit = ct.startsWith('video/') ? MAX_VIDEO_BYTES
                : ct.startsWith('audio/') ? MAX_AUDIO_BYTES
                : MAX_IMAGE_BYTES
    if (file.size > limit) return c.json({ error: `File too large: ${file.name}` }, 422)
  }

  // Fall back to mock immediately if no API key
  if (!config.ANTHROPIC_API_KEY) {
    const bannerUrl = await tryUploadFirst(rawFiles, 'venues')
    return c.json({ ...MOCK_DRAFT, ...(bannerUrl ? { bannerUrl } : {}) })
  }

  // Separate files by type
  const images:     { buffer: ArrayBuffer; mimeType: string }[] = []
  const voiceBlobs: { buffer: ArrayBuffer; mimeType: string }[] = []
  const uploadedUrls: string[] = []

  for (const file of rawFiles) {
    const ct     = file.type.toLowerCase()
    const buffer = await file.arrayBuffer()

    if (ALLOWED_IMAGE_TYPES.has(ct)) {
      // Upload all images; collect buffers for Claude
      try {
        const url = await uploadFile(Buffer.from(buffer), ct, 'venues')
        uploadedUrls.push(url)
      } catch (err) {
        console.warn('Image upload failed:', err)
      }
      images.push({ buffer, mimeType: ct })
    } else if (ALLOWED_AUDIO_TYPES.has(ct) || file.name.startsWith('voice-')) {
      // Voice recordings — normalise MIME for Claude
      const mimeType = ct.startsWith('audio/') ? ct : 'audio/webm'
      voiceBlobs.push({ buffer, mimeType })
    }
    // Video files are accepted for upload but not passed to Claude directly
  }

  try {
    const enriched = await orchestrateEventCreation(images, voiceBlobs, message)
    const bannerUrl = uploadedUrls[0]
    return c.json({ ...enriched, ...(bannerUrl ? { bannerUrl } : {}) })
  } catch (err) {
    console.error('Orchestration failed:', err)
    const bannerUrl = uploadedUrls[0]
    return c.json({ ...MOCK_DRAFT, ...(bannerUrl ? { bannerUrl } : {}) })
  }
})

async function tryUploadFirst(files: File[], prefix: string): Promise<string | undefined> {
  for (const file of files) {
    if (ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
      try {
        return await uploadFile(Buffer.from(await file.arrayBuffer()), file.type, prefix)
      } catch { /* skip */ }
    }
  }
}

// POST /agent/run — trigger create-event workflow
router.post('/run', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch { body = {} }

  const parsed = EventDraftSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid draft payload', details: parsed.error.flatten() }, 422)
  }

  try {
    const workflow = mastra.getWorkflow('createEventWorkflow')
    const run      = await workflow.createRun()
    await run.start({ inputData: parsed.data })
    return c.json({ status: 'started', runId: run.runId })
  } catch (err) {
    console.error('Workflow failed:', err)
    return c.json({ error: 'Workflow execution failed' }, 500)
  }
})

// GET /agent/status
router.get('/status', async (c) => {
  return c.json({
    agents: [
      'venueAgent', 'imageExtractorAgent', 'voiceExtractorAgent', 'textExtractorAgent',
      'descriptionGeneratorAgent', 'priceOptimizerAgent', 'inviteeOptimizerAgent', 'eventImageGeneratorAgent',
    ],
    workflows: ['createEventWorkflow'],
    ai:        config.ANTHROPIC_API_KEY ? 'ready' : 'no key',
    studio:    'http://localhost:4111',
  })
})

export default router

import { Hono } from 'hono'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { mastra } from '../mastra'
import { EventDraftSchema, type EventDraft } from '../mastra/agents/venue'
import { config } from '../config'

const router = new Hono()

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const ALLOWED_TYPES       = new Set([...ALLOWED_IMAGE_TYPES, 'video/mp4', 'video/webm', 'video/quicktime'])
const MAX_IMAGE_BYTES     = 10 * 1024 * 1024
const MAX_VIDEO_BYTES     = 50 * 1024 * 1024
const MAX_FILES           = 5

const MOCK_DRAFT: EventDraft = {
  name:        'Pro Vibes – bunq demo day',
  date:        'Sat, 25 Apr • 14:00',
  location:    'bunq HQ, Amsterdam',
  description: 'An unforgettable night of music, networking, and great vibes at bunq HQ.',
  ticketTiers: [
    { id: 'general', name: 'General Admission', price: '€25.00' },
    { id: 'vip',     name: 'VIP Table',         price: '€1000.00' },
  ],
}

const SYSTEM_PROMPT = `You are an event-setup assistant for bunq.
Analyze the venue images and/or text and return a complete event draft.
Always respond with a single JSON object matching the exact schema — no markdown, no extra text.`

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

  // Validate file types and sizes
  for (const file of rawFiles) {
    const ct = file.type.toLowerCase()
    if (!ALLOWED_TYPES.has(ct)) {
      return c.json({ error: `Unsupported file type: ${ct}` }, 422)
    }
    const limit = ct.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
    if (file.size > limit) {
      return c.json({ error: `File too large: ${file.name}` }, 422)
    }
  }

  // Fall back to mock if no API key configured
  if (!config.ANTHROPIC_API_KEY) {
    return c.json(MOCK_DRAFT)
  }

  // Build message content — only images go to Claude (no video support yet)
  type ContentPart =
    | { type: 'text';  text: string }
    | { type: 'image'; image: ArrayBuffer; mimeType: string }

  const content: ContentPart[] = []

  for (const file of rawFiles) {
    if (ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
      content.push({
        type:     'image',
        image:    await file.arrayBuffer(),
        mimeType: file.type,
      })
    }
  }

  content.push({
    type: 'text',
    text: message || 'Analyze this venue and create a realistic event draft.',
  })

  try {
    const { object } = await generateObject({
      model:  anthropic('claude-opus-4-7'),
      schema: EventDraftSchema,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: content as any }],
    })
    return c.json(object)
  } catch (err) {
    console.error('AI analysis failed:', err)
    return c.json(MOCK_DRAFT)
  }
})

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
  const agentNames    = Object.keys(mastra.getAgents?.() ?? {})
  const workflowNames = Object.keys(mastra.getWorkflows?.() ?? {})
  return c.json({
    agents:    agentNames,
    workflows: workflowNames,
    ai:        config.ANTHROPIC_API_KEY ? 'ready' : 'no key',
  })
})

export default router

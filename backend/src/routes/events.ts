import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { db } from '../db/client'
import { events, ticketTiers, tickets } from '../db/schema'
import { parsePrice } from '../db/price'
import { uploadFile } from '../storage/client'

const router = new Hono()

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_IMAGE_BYTES     = 10 * 1024 * 1024

const TierSchema = z.object({
  id:       z.string().optional(),
  name:     z.string().min(1),
  price:    z.string().min(1),
  currency: z.enum(['EUR', 'USD', 'GBP']).default('EUR'),
})

const DraftSchema = z.object({
  name:        z.string().min(1),
  date:        z.string().default(''),
  location:    z.string().default(''),
  description: z.string().default(''),
  creatorId:   z.string().uuid().optional(),
  bannerUrl:   z.string().url().optional(),
  ticketTiers: z.array(TierSchema).default([]),
})

const UpdateEventSchema = DraftSchema.partial().extend({
  status: z.enum(['draft', 'live', 'archived']).optional(),
})

// GET /events — list all events
router.get('/', async (c) => {
  const rows = await db.select().from(events).orderBy(events.createdAt)
  return c.json(rows)
})

// GET /events/:id — event + its tiers
router.get('/:id', async (c) => {
  const id = c.req.param('id')
  const [event] = await db.select().from(events).where(eq(events.id, id))
  if (!event) return c.json({ error: 'Event not found' }, 404)
  const tiers = await db.select().from(ticketTiers).where(eq(ticketTiers.eventId, id))
  return c.json({ ...event, tiers })
})

// GET /events/:id/stats — event + tier breakdown + actual ticket sales
router.get('/:id/stats', async (c) => {
  const id = c.req.param('id')
  const [event] = await db.select().from(events).where(eq(events.id, id))
  if (!event) return c.json({ error: 'Event not found' }, 404)

  const tiers = await db.select().from(ticketTiers).where(eq(ticketTiers.eventId, id))

  // Count paid tickets per tier
  const soldRows = await db
    .select({ tierId: tickets.tierId, count: sql<number>`count(*)::int` })
    .from(tickets)
    .where(eq(tickets.paymentStatus, 'paid'))
    .groupBy(tickets.tierId)

  const soldByTier = Object.fromEntries(soldRows.map(r => [r.tierId, r.count]))

  const tierStats = tiers.map(t => {
    const sold       = soldByTier[t.id] ?? 0
    const priceNum   = parseFloat(t.price)
    const capacity   = t.quantity ?? null
    return {
      id:              t.id,
      name:            t.name,
      price:           t.price,
      currency:        t.currency,
      capacity,
      sold,
      remaining:       capacity !== null ? capacity - sold : null,
      actualRevenue:   (sold * priceNum).toFixed(2),
      projectedRevenue: capacity !== null ? (capacity * priceNum).toFixed(2) : null,
    }
  })

  const totalSold            = tierStats.reduce((s, t) => s + t.sold, 0)
  const totalActualRevenue   = tierStats.reduce((s, t) => s + parseFloat(t.actualRevenue), 0).toFixed(2)
  const totalCapacity        = tierStats.every(t => t.capacity !== null)
    ? tierStats.reduce((s, t) => s + (t.capacity ?? 0), 0)
    : null
  const totalProjectedRevenue = totalCapacity !== null
    ? tierStats.reduce((s, t) => s + parseFloat(t.projectedRevenue ?? '0'), 0).toFixed(2)
    : null

  return c.json({
    event,
    tiers: tierStats,
    summary: { totalSold, totalActualRevenue, totalCapacity, totalProjectedRevenue },
  })
})

// POST /events — create event with optional file uploads
// Accepts multipart/form-data: draft (JSON string), banner (File), media-N (File[])
router.post('/', async (c) => {
  // Try multipart first; fall back to JSON for backwards compat
  const contentType = c.req.header('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    let formData: FormData
    try { formData = await c.req.formData() } catch {
      return c.json({ error: 'Invalid multipart body' }, 400)
    }

    const rawDraft = formData.get('draft')
    if (!rawDraft || typeof rawDraft !== 'string') {
      return c.json({ error: 'Missing "draft" JSON field' }, 400)
    }

    let parsedDraft: unknown
    try { parsedDraft = JSON.parse(rawDraft) } catch {
      return c.json({ error: 'Invalid JSON in "draft" field' }, 400)
    }

    const draft = DraftSchema.safeParse(parsedDraft)
    if (!draft.success) {
      return c.json({ error: 'Invalid draft', details: draft.error.flatten() }, 422)
    }

    const eventId = randomUUID()

    const bannerFile = formData.get('banner') instanceof File ? formData.get('banner') as File : null
    const mediaFiles = formData.getAll('media').filter(v => v instanceof File) as File[]

    const isImage = (f: File) => ALLOWED_IMAGE_TYPES.has(f.type.toLowerCase()) && f.size <= MAX_IMAGE_BYTES

    // Upload banner and all media files in parallel, scoped to this event
    const [bannerUpload, ...mediaUploads] = await Promise.allSettled([
      ...(bannerFile && isImage(bannerFile)
        ? [bannerFile.arrayBuffer().then(buf =>
            uploadFile(Buffer.from(buf), bannerFile.type.toLowerCase(), `events/${eventId}/banner`))]
        : [Promise.resolve(null)]),
      ...mediaFiles.filter(isImage).map(f =>
        f.arrayBuffer().then(buf =>
          uploadFile(Buffer.from(buf), f.type.toLowerCase(), `events/${eventId}/media`)
        )
      ),
    ])

    const uploadedBannerUrl = bannerUpload.status === 'fulfilled' ? bannerUpload.value : null
    const uploadedMediaUrls = mediaUploads
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && typeof r.value === 'string')
      .map(r => r.value)

    const { data: d } = draft
    // Banner priority: new file upload > pre-uploaded URL from AI analyze step
    const bannerUrl = uploadedBannerUrl ?? d.bannerUrl ?? null
    await db.insert(events).values({
      id:          eventId,
      creatorId:   d.creatorId,
      name:        d.name,
      date:        d.date,
      location:    d.location,
      description: d.description,
      bannerUrl:   bannerUrl ?? undefined,
      mediaUrls:   uploadedMediaUrls,
    })

    if (d.ticketTiers.length > 0) {
      await db.insert(ticketTiers).values(
        d.ticketTiers.map(t => ({
          eventId,
          name:     t.name,
          price:    parsePrice(t.price),
          currency: t.currency,
        }))
      )
    }

    const tiers = await db.select().from(ticketTiers).where(eq(ticketTiers.eventId, eventId))
    const [event] = await db.select().from(events).where(eq(events.id, eventId))
    return c.json({ ...event, tiers }, 201)
  }

  // JSON fallback (for Mastra Studio / direct API calls)
  const body = await c.req.json().catch(() => null)
  const parsed = DraftSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid payload', details: parsed.error.flatten() }, 422)
  }

  const { data: d } = parsed
  const [event] = await db.insert(events).values({
    name:        d.name,
    date:        d.date,
    location:    d.location,
    description: d.description,
    creatorId:   d.creatorId,
  }).returning()

  if (d.ticketTiers.length > 0) {
    await db.insert(ticketTiers).values(
      d.ticketTiers.map(t => ({
        eventId:  event.id,
        name:     t.name,
        price:    parsePrice(t.price),
        currency: t.currency,
      }))
    )
  }

  const tiers = await db.select().from(ticketTiers).where(eq(ticketTiers.eventId, event.id))
  return c.json({ ...event, tiers }, 201)
})

// PUT /events/:id — partial update
router.put('/:id', zValidator('json', UpdateEventSchema), async (c) => {
  const id   = c.req.param('id')
  const body = c.req.valid('json')

  const { ticketTiers: tiers, ...fields } = body

  if (Object.keys(fields).length > 0) {
    await db.update(events).set(fields).where(eq(events.id, id))
  }

  if (tiers !== undefined) {
    await db.delete(ticketTiers).where(eq(ticketTiers.eventId, id))
    if (tiers.length > 0) {
      await db.insert(ticketTiers).values(
        tiers.map(t => ({
          eventId:  id,
          name:     t.name,
          price:    parsePrice(t.price),
          currency: t.currency,
        }))
      )
    }
  }

  const [updated] = await db.select().from(events).where(eq(events.id, id))
  if (!updated) return c.json({ error: 'Event not found' }, 404)
  const updatedTiers = await db.select().from(ticketTiers).where(eq(ticketTiers.eventId, id))
  return c.json({ ...updated, tiers: updatedTiers })
})

// DELETE /events/:id
router.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(events).where(eq(events.id, id))
  return c.body(null, 204)
})

export default router

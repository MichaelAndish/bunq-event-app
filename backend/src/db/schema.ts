import { pgTable, pgEnum, uuid, text, numeric, integer, timestamp } from 'drizzle-orm/pg-core'

export const eventStatusEnum  = pgEnum('event_status',  ['draft', 'live', 'archived'])
export const currencyEnum      = pgEnum('currency',       ['EUR', 'USD', 'GBP'])
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed'])

export const events = pgTable('events', {
  id:          uuid('id').defaultRandom().primaryKey(),
  name:        text('name').notNull(),
  date:        text('date').notNull(),
  location:    text('location').notNull(),
  description: text('description').default(''),
  bannerUrl:   text('banner_url'),
  status:      eventStatusEnum('status').default('draft'),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const ticketTiers = pgTable('ticket_tiers', {
  id:       uuid('id').defaultRandom().primaryKey(),
  eventId:  uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  name:     text('name').notNull(),
  price:    numeric('price', { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum('currency').default('EUR'),
  quantity: integer('quantity'),
})

export const tickets = pgTable('tickets', {
  id:            uuid('id').defaultRandom().primaryKey(),
  tierId:        uuid('tier_id').references(() => ticketTiers.id, { onDelete: 'restrict' }).notNull(),
  buyerName:     text('buyer_name').notNull(),
  buyerEmail:    text('buyer_email').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').default('pending'),
  bunqPaymentId: text('bunq_payment_id'),
  purchasedAt:   timestamp('purchased_at', { withTimezone: true }).defaultNow(),
})

export type Event      = typeof events.$inferSelect
export type NewEvent   = typeof events.$inferInsert
export type TicketTier = typeof ticketTiers.$inferSelect
export type Ticket     = typeof tickets.$inferSelect

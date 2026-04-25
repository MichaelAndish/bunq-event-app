import { Mastra } from '@mastra/core'
import { PostgresStore } from '@mastra/pg'
import { config } from '../config'
import { venueAgent } from './agents/venue'
import { createEventWorkflow } from './workflows/create-event'

const storage = new PostgresStore({
  id:               'mastra-storage',
  connectionString: config.DATABASE_URL,
})

export const mastra = new Mastra({
  agents:    { venueAgent },
  workflows: { createEventWorkflow },
  storage,
  server: {
    port:       4111,
    host:       '0.0.0.0',   // bind inside Docker
    studioHost: 'localhost', // browser calls go to localhost, not 0.0.0.0
  },
})

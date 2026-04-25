import { Mastra } from '@mastra/core'
import { venueAgent } from './agents/venue'
import { createEventWorkflow } from './workflows/create-event'

export const mastra = new Mastra({
  agents:    { venueAgent },
  workflows: { createEventWorkflow },
  // To enable persistent agent memory backed by Postgres, add:
  // memory: new Memory({ connectionString: config.DATABASE_URL })
  // Requires: npm install @mastra/memory
})

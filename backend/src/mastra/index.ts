import { Mastra } from '@mastra/core'
import { Observability, DefaultExporter } from '@mastra/observability'
import { PostgresStore } from '@mastra/pg'
import { config } from '../config'
import { venueAgent }               from './agents/venue'
import { imageExtractorAgent }      from './agents/image-extractor'
import { voiceExtractorAgent }      from './agents/voice-extractor'
import { textExtractorAgent }       from './agents/text-extractor'
import { descriptionGeneratorAgent } from './agents/description-generator'
import { priceOptimizerAgent }      from './agents/price-optimizer'
import { inviteeOptimizerAgent }    from './agents/invitee-optimizer'
import { eventImageGeneratorAgent } from './agents/event-image-generator'
import { createEventWorkflow }      from './workflows/create-event'

const storage = new PostgresStore({
  id:               'mastra-storage',
  connectionString: config.DATABASE_URL,
})

const observability = new Observability({
  configs: {
    default: {
      serviceName: 'bunq-events',
      exporters: [new DefaultExporter()],
    },
  },
})

export const mastra = new Mastra({
  agents: {
    venueAgent,
    imageExtractorAgent,
    voiceExtractorAgent,
    textExtractorAgent,
    descriptionGeneratorAgent,
    priceOptimizerAgent,
    inviteeOptimizerAgent,
    eventImageGeneratorAgent,
  },
  workflows: { createEventWorkflow },
  storage,
  observability,
  server: {
    port:       4111,
    host:       '0.0.0.0',
    studioHost: 'localhost',
  },
})

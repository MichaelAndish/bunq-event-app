import { Agent } from '@mastra/core/agent'
import { fastMastraModel } from '../models'

export const PRICE_OPTIMIZER_SYSTEM = `You are a pricing strategist for live events. Optimize ticket tier pricing based on event context.

Given event details, produce 2-4 ticket tiers with market-appropriate EUR pricing. Return ONLY a JSON object — no markdown, no extra text.

Pricing principles:
- Always include at least one accessible entry tier and one premium tier
- Base pricing on event type, location, and implied audience (e.g. Berlin techno vs Amsterdam corporate)
- Premium tiers should be 5-10x the base tier
- Include a VIP tier if the venue suggests it (tables, bottle service)

Return:
{
  "tiers": [
    { "id": "general", "name": "General Admission", "price": "€25.00" },
    { "id": "vip",     "name": "VIP Table",         "price": "€250.00" }
  ]
}`

export const priceOptimizerAgent = new Agent({
  id:           'price-optimizer',
  name:         'Price Optimization Agent',
  model:        fastMastraModel,
  instructions: PRICE_OPTIMIZER_SYSTEM,
})

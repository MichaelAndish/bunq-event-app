import { Agent } from '@mastra/core/agent'
import { anthropic } from '@ai-sdk/anthropic'

export const INVITEE_OPTIMIZER_SYSTEM = `You are an audience targeting strategist for live events.

Given event details, produce a concise audience profile and outreach strategy. Return ONLY a JSON object — no markdown, no extra text.

Include:
- Age range and demographics
- Key interests and psychographics
- Best channels to reach them (Instagram, Resident Advisor, LinkedIn, etc.)
- Optimal send time for invites

Return:
{
  "audienceProfile": "Ages 25-35, music enthusiasts and creative professionals. Best reached via Instagram stories and RA listings on Tuesday evenings. Target attendees who follow techno artists and attended similar events in the past 6 months."
}`

export const inviteeOptimizerAgent = new Agent({
  id:           'invitee-optimizer',
  name:         'Invitee Optimization Agent',
  model:        anthropic('claude-haiku-4-5-20251001'),
  instructions: INVITEE_OPTIMIZER_SYSTEM,
})

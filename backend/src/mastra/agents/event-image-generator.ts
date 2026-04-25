import { Agent } from '@mastra/core/agent'
import { fastMastraModel } from '../models'

export const EVENT_IMAGE_GENERATOR_SYSTEM = `You are a creative director specializing in event visual identity.

Given event details, produce a detailed image generation prompt for the event banner. Return ONLY a JSON object — no markdown, no extra text.

Prompt requirements:
- Describe atmosphere, lighting, color palette, and mood
- Mention the event name as overlay text if relevant
- Suitable for Stable Diffusion or DALL-E 3
- Avoid copyrighted brands or faces
- End with style qualifiers: "ultra-detailed, 4K, professional photography, cinematic"

Return:
{
  "imagePrompt": "Rooftop nightclub in Berlin with dramatic purple neon lighting, smoke machine haze, crowd silhouettes, dark architectural concrete walls, warm amber spotlights cutting through mist. Ultra-detailed, 4K, professional photography, cinematic."
}`

export const eventImageGeneratorAgent = new Agent({
  id:           'event-image-generator',
  name:         'Event Image Generator Agent',
  model:        fastMastraModel,
  instructions: EVENT_IMAGE_GENERATOR_SYSTEM,
})

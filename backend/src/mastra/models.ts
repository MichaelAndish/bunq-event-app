import { anthropic } from '@ai-sdk/anthropic'
import { config } from '../config'

export const defaultMastraModel = anthropic(config.MASTRA_MODEL)
export const fastMastraModel = anthropic(config.MASTRA_FAST_MODEL || config.MASTRA_MODEL)

// Minimal schemas: full plugin validation removed (no more plugin marketplace)
import { z } from 'zod/v4'

export type CommandMetadata = any
export type PluginAuthor = { name?: string; email?: string; url?: string }
export type PluginManifest = { name: string; version?: string; description?: string }
export type PluginMarketplaceEntry = any
export type PluginScope = string
export type PluginSource = string

export const PluginHooksSchema = z.any()
export const PluginIdSchema = z.string()
export const PluginManifestSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  description: z.string().optional(),
  commands: z.record(z.string(), z.any()).optional(),
  hooks: z.any().optional(),
  mcpServers: z.record(z.string(), z.any()).optional(),
}).passthrough()

export const MarketplaceSourceSchema = z.object({
  url: z.string(),
  type: z.enum(['git']),
})

export const ALLOWED_OFFICIAL_MARKETPLACE_NAMES = new Set<string>(['claude-plugins-official'])

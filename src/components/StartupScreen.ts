// Minimal startup info — prints model/provider/endpoint
import { parseUserSpecifiedModel } from '../utils/model/model.js'
import { getInitialSettings } from '../utils/settings/settings.js'

function detectProvider(modelOverride?: string): { name: string; model: string; baseUrl: string } {
  const settings = getInitialSettings() || {}
  const modelSetting = modelOverride || process.env.ANTHROPIC_MODEL || settings.model || ''
  const resolvedModel = parseUserSpecifiedModel(modelSetting)
  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'
  return { name: 'Anthropic', model: resolvedModel, baseUrl }
}

export function printStartupScreen(modelOverride?: string): void {
  if (process.env.CI || !process.stdout.isTTY) return

  const p = detectProvider(modelOverride)
  process.stdout.write(`  ${p.name} · ${p.model} · ${p.baseUrl}\n\n`)
}

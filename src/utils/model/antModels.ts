// Ant-specific models removed for open-source build
export type AntModel = {
  alias: string
  model: string
  label: string
  description?: string
  defaultEffortValue?: number
  defaultEffortLevel?: string
  contextWindow?: number
  defaultMaxTokens?: number
  upperMaxTokensLimit?: number
  alwaysOnThinking?: boolean
}
export type AntModelSwitchCalloutConfig = { modelAlias?: string; description: string; version: string }
export type AntModelOverrideConfig = {
  defaultModel?: string
  defaultModelEffortLevel?: string
  defaultSystemPromptSuffix?: string
  antModels?: AntModel[]
  switchCallout?: AntModelSwitchCalloutConfig
}
export function getAntModelOverrideConfig(): AntModelOverrideConfig | null { return null }
export function getAntModels(): AntModel[] { return [] }
export function resolveAntModel(_model?: string): AntModel | undefined { return undefined }

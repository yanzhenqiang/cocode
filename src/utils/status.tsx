import * as React from 'react';
import { color, Text } from '../ink.js';
import type { MCPServerConnection } from '../services/mcp/types.js';
import { getAccountInformation } from './auth.js';
import { getLargeMemoryFiles, getMemoryFiles, MAX_MEMORY_CHARACTER_COUNT } from './claudemd.js';
import { getDefaultVertexRegion, isEnvTruthy } from './envUtils.js';
import { getDisplayPath } from './file.js';
import { formatNumber } from './format.js';
import { modelDisplayString } from './model/model.js';
import { getAPIProvider, type APIProvider } from './model/providers.js';
import { resolveProviderRequest } from '../services/api/providerConfig.js';
import { getMTLSConfig } from './mtls.js';
// nativeInstaller removed
import { getProxyUrl } from './proxy.js';
import { getSettingsWithAllErrors } from './settings/allErrors.js';
import { getEnabledSettingSources, getSettingSourceDisplayNameCapitalized } from './settings/constants.js';
import { getManagedFileSettingsPresence, getPolicySettingsOrigin, getSettingsForSource } from './settings/settings.js';
import type { ThemeName } from './theme.js';

export type Property = {
  label?: string;
  value: React.ReactNode | Array<string>;
};
export type Diagnostic = React.ReactNode;

const API_PROVIDER_LABELS: Partial<Record<APIProvider, string>> = {
  bedrock: 'AWS Bedrock',
  vertex: 'Google Vertex AI',
  foundry: 'Microsoft Foundry',
  openai: 'OpenAI-compatible',
  gemini: 'Google Gemini',
  github: 'GitHub Models',
  'nvidia-nim': 'NVIDIA NIM',
  minimax: 'MiniMax',
  mistral: 'Mistral',
  xai: 'xAI',
  'xiaomi-mimo': 'Xiaomi MiMo',
};

const OPENAI_COMPATIBLE_STATUS_METADATA: Partial<
  Record<
    APIProvider,
    {
      baseUrlLabel: string;
      resolveModelMetadata?: boolean;
    }
  >
> = {
  openai: {
    baseUrlLabel: 'OpenAI base URL',
    resolveModelMetadata: true,
  },
  'nvidia-nim': {
    baseUrlLabel: 'NVIDIA NIM base URL',
  },
  minimax: {
    baseUrlLabel: 'MiniMax base URL',
  },
  xai: {
    baseUrlLabel: 'xAI base URL',
    resolveModelMetadata: true,
  },
  'xiaomi-mimo': {
    baseUrlLabel: 'Xiaomi MiMo base URL',
  },
};

function formatOpenAICompatibleModelDisplay(
  model: string,
  resolveModelMetadata = false,
): string {
  if (!resolveModelMetadata) {
    return model;
  }

  let modelDisplay = model;
  const resolved = resolveProviderRequest({ model });
  const resolvedModel = resolved.resolvedModel;
  const reasoningEffort = resolved.reasoning?.effort;

  if (resolvedModel && resolvedModel !== model.toLowerCase()) {
    modelDisplay = resolvedModel;
  }

  if (reasoningEffort) {
    modelDisplay = `${modelDisplay} (${reasoningEffort})`;
  }

  return modelDisplay;
}

function pushRedactedProperty(
  properties: Property[],
  label: string,
  value: string | undefined,
): void {
  if (!value) {
    return;
  }

  properties.push({
    label,
    value,
  });
}
export function buildSandboxProperties(): Property[] {
  if (true) {
    return [];
  }
  const isSandboxed = false;
  return [{
    label: 'Bash Sandbox',
    value: isSandboxed ? 'Enabled' : 'Disabled'
  }];
}
export function buildIDEProperties(_mcpClients: MCPServerConnection[], _ideInstallationStatus: null = null, _theme: ThemeName): Property[] {
  // IDE integration removed
  return [];
}
export function buildMcpProperties(clients: MCPServerConnection[] = [], theme: ThemeName): Property[] {
  const servers = clients;
  if (!servers.length) {
    return [];
  }

  // Summary instead of a full server list — 20+ servers wrapped onto many
  // rows, dominating the Status pane. Show counts by state + /mcp hint.
  const byState = {
    connected: 0,
    pending: 0,
    needsAuth: 0,
    failed: 0
  };
  for (const s of servers) {
    if (s.type === 'connected') byState.connected++;else if (s.type === 'pending') byState.pending++;else if (s.type === 'needs-auth') byState.needsAuth++;else byState.failed++;
  }
  const parts: string[] = [];
  if (byState.connected) parts.push(color('success', theme)(`${byState.connected} connected`));
  if (byState.needsAuth) parts.push(color('warning', theme)(`${byState.needsAuth} need auth`));
  if (byState.pending) parts.push(color('inactive', theme)(`${byState.pending} pending`));
  if (byState.failed) parts.push(color('error', theme)(`${byState.failed} failed`));
  return [{
    label: 'MCP servers',
    value: `${parts.join(', ')} ${color('inactive', theme)('· /mcp')}`
  }];
}
export async function buildMemoryDiagnostics(): Promise<Diagnostic[]> {
  const files = await getMemoryFiles();
  const largeFiles = getLargeMemoryFiles(files);
  const diagnostics: Diagnostic[] = [];
  largeFiles.forEach(file => {
    const displayPath = getDisplayPath(file.path);
    diagnostics.push(`Large ${displayPath} will impact performance (${formatNumber(file.content.length)} chars > ${formatNumber(MAX_MEMORY_CHARACTER_COUNT)})`);
  });
  return diagnostics;
}
export function buildSettingSourcesProperties(): Property[] {
  const enabledSources = getEnabledSettingSources();

  // Filter to only sources that actually have settings loaded
  const sourcesWithSettings = enabledSources.filter(source => {
    const settings = getSettingsForSource(source);
    return settings !== null && Object.keys(settings).length > 0;
  });

  // Map internal names to user-friendly names
  // For policySettings, distinguish between remote and local (or skip if neither exists)
  const sourceNames = sourcesWithSettings.map(source => {
    if (source === 'policySettings') {
      const origin = getPolicySettingsOrigin();
      if (origin === null) {
        return null; // Skip - no policy settings exist
      }
      switch (origin) {
        case 'remote':
          return 'Enterprise managed settings (remote)';
        case 'plist':
          return 'Enterprise managed settings (plist)';
        case 'hklm':
          return 'Enterprise managed settings (HKLM)';
        case 'file':
          {
            const {
              hasBase,
              hasDropIns
            } = getManagedFileSettingsPresence();
            if (hasBase && hasDropIns) {
              return 'Enterprise managed settings (file + drop-ins)';
            }
            if (hasDropIns) {
              return 'Enterprise managed settings (drop-ins)';
            }
            return 'Enterprise managed settings (file)';
          }
        case 'hkcu':
          return 'Enterprise managed settings (HKCU)';
      }
    }
    return getSettingSourceDisplayNameCapitalized(source);
  }).filter((name): name is string => name !== null);
  return [{
    label: 'Setting sources',
    value: sourceNames
  }];
}
export async function buildInstallationDiagnostics(): Promise<Diagnostic[]> {
  const installWarnings: never[] = [];
  return installWarnings.map(warning => warning.message);
}
export async function buildInstallationHealthDiagnostics(): Promise<Diagnostic[]> {
  const items: Diagnostic[] = [];
  const {
    errors: validationErrors
  } = getSettingsWithAllErrors();
  if (validationErrors.length > 0) {
    const invalidFiles = Array.from(new Set(validationErrors.map(error => error.file)));
    const fileList = invalidFiles.join(', ');
    items.push(`Found invalid settings files: ${fileList}. They will be ignored.`);
  }
  return items;
}
export function buildAccountProperties(): Property[] {
  const accountInfo = getAccountInformation();
  if (!accountInfo) {
    return [];
  }
  const properties: Property[] = [];
  if (accountInfo.subscription) {
    properties.push({
      label: 'Login method',
      value: `${accountInfo.subscription} Account`
    });
  }
  if (accountInfo.tokenSource) {
    properties.push({
      label: 'Auth token',
      value: accountInfo.tokenSource
    });
  }
  if (accountInfo.apiKeySource) {
    properties.push({
      label: 'API key',
      value: accountInfo.apiKeySource
    });
  }

  // Hide sensitive account info in demo mode
  if (accountInfo.organization && !process.env.IS_DEMO) {
    properties.push({
      label: 'Organization',
      value: accountInfo.organization
    });
  }
  if (accountInfo.email && !process.env.IS_DEMO) {
    properties.push({
      label: 'Email',
      value: accountInfo.email
    });
  }
  return properties;
}
export function buildAPIProviderProperties(): Property[] {
  const apiProvider = getAPIProvider();
  const properties: Property[] = [];
  if (apiProvider !== 'firstParty') {
    const providerLabel = API_PROVIDER_LABELS[apiProvider];
    properties.push({
      label: 'API provider',
      value: providerLabel
    });
  }
  if (apiProvider === 'firstParty') {
    const anthropicBaseUrl = process.env.ANTHROPIC_BASE_URL;
    if (anthropicBaseUrl) {
      properties.push({
        label: 'Anthropic base URL',
        value: anthropicBaseUrl
      });
    }
  } else if (apiProvider === 'vertex') {
    const vertexBaseUrl = process.env.VERTEX_BASE_URL;
    if (vertexBaseUrl) {
      properties.push({
        label: 'Vertex base URL',
        value: vertexBaseUrl
      });
    }
    const gcpProject = process.env.ANTHROPIC_VERTEX_PROJECT_ID;
    if (gcpProject) {
      properties.push({
        label: 'GCP project',
        value: gcpProject
      });
    }
    properties.push({
      label: 'Default region',
      value: getDefaultVertexRegion()
    });
    if (isEnvTruthy(process.env.CLAUDE_CODE_SKIP_VERTEX_AUTH)) {
      properties.push({
        value: 'GCP auth skipped'
      });
    }
  } else if (apiProvider === 'foundry') {
    const foundryBaseUrl = process.env.ANTHROPIC_FOUNDRY_BASE_URL;
    if (foundryBaseUrl) {
      properties.push({
        label: 'Microsoft Foundry base URL',
        value: foundryBaseUrl
      });
    }
    const foundryResource = process.env.ANTHROPIC_FOUNDRY_RESOURCE;
    if (foundryResource) {
      properties.push({
        label: 'Microsoft Foundry resource',
        value: foundryResource
      });
    }
    if (isEnvTruthy(process.env.CLAUDE_CODE_SKIP_FOUNDRY_AUTH)) {
      properties.push({
        value: 'Microsoft Foundry auth skipped'
      });
    }
  } else if (apiProvider in OPENAI_COMPATIBLE_STATUS_METADATA) {
    const metadata =
      OPENAI_COMPATIBLE_STATUS_METADATA[apiProvider]!;
    pushRedactedProperty(
      properties,
      metadata.baseUrlLabel,
      process.env.OPENAI_BASE_URL,
      secretSource,
    );
    const openaiModel = process.env.OPENAI_MODEL;
    if (openaiModel) {
      const modelDisplay = formatOpenAICompatibleModelDisplay(
        openaiModel,
        metadata.resolveModelMetadata,
      );
      pushRedactedProperty(
        properties,
        'Model',
        modelDisplay,
        secretSource,
      );
    }
  } else if (apiProvider === 'gemini') {
    const geminiBaseUrl = process.env.GEMINI_BASE_URL;
    pushRedactedProperty(properties, 'Gemini base URL', geminiBaseUrl);
    const geminiModel = process.env.GEMINI_MODEL;
    pushRedactedProperty(properties, 'Model', geminiModel);
  } else if (apiProvider === 'mistral') {
    const mistralBaseUrl = process.env.MISTRAL_BASE_URL;
    pushRedactedProperty(properties, 'Mistral base URL', mistralBaseUrl);
    const mistralModel = process.env.MISTRAL_MODEL;
    pushRedactedProperty(properties, 'Model', mistralModel);
  }
  const proxyUrl = getProxyUrl();
  if (proxyUrl) {
    properties.push({
      label: 'Proxy',
      value: proxyUrl
    });
  }
  const mtlsConfig = getMTLSConfig();
  if (process.env.NODE_EXTRA_CA_CERTS) {
    properties.push({
      label: 'Additional CA cert(s)',
      value: process.env.NODE_EXTRA_CA_CERTS
    });
  }
  if (mtlsConfig) {
    if (mtlsConfig.cert && process.env.CLAUDE_CODE_CLIENT_CERT) {
      properties.push({
        label: 'mTLS client cert',
        value: process.env.CLAUDE_CODE_CLIENT_CERT
      });
    }
    if (mtlsConfig.key && process.env.CLAUDE_CODE_CLIENT_KEY) {
      properties.push({
        label: 'mTLS client key',
        value: process.env.CLAUDE_CODE_CLIENT_KEY
      });
    }
  }
  return properties;
}
export function getModelDisplayLabel(mainLoopModel: string | null): string {
  return modelDisplayString(mainLoopModel);
}

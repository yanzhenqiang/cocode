import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import type {
  ConnectedMCPServer,
  MCPServerConnection,
} from '../services/mcp/types.js'

export type IdeType =
  | 'cursor'
  | 'windsurf'
  | 'vscode'
  | 'pycharm'
  | 'intellij'
  | 'webstorm'
  | 'phpstorm'
  | 'rubymine'
  | 'clion'
  | 'goland'
  | 'rider'
  | 'datagrip'
  | 'appcode'
  | 'dataspell'
  | 'aqua'
  | 'gateway'
  | 'fleet'
  | 'androidstudio'

export type DetectedIDEInfo = {
  name: string
  port: number
  workspaceFolders: string[]
  url: string
  isValid: boolean
  authToken?: string
  ideRunningInWindows?: boolean
}

export interface IDEExtensionInstallationStatus {
  installed: boolean
  error: string | null
  installedVersion: string | null
  ideType: IdeType | null
}

export function isVSCodeIde(_ide: IdeType | null): boolean {
  return false
}

export function isJetBrainsIde(_ide: IdeType | null): boolean {
  return false
}

export const isSupportedVSCodeTerminal = () => false

// JetBrains IDE detection removed

export const isSupportedTerminal = () => false

export function getTerminalIdeType(): IdeType | null {
  return null
}

export async function getSortedIdeLockfiles(): Promise<string[]> {
  return []
}

export async function getIdeLockfilesPaths(): Promise<string[]> {
  return []
}

export async function cleanupStaleIdeLockfiles(): Promise<void> {
  // no-op
}

export async function maybeInstallIDEExtension(
  _ideType: IdeType,
): Promise<IDEExtensionInstallationStatus | null> {
  return { installed: false, error: null, installedVersion: null, ideType: null }
}

export async function findAvailableIDE(): Promise<DetectedIDEInfo | null> {
  return null
}

export async function detectIDEs(
  _includeInvalid: boolean,
): Promise<DetectedIDEInfo[]> {
  return []
}

export async function maybeNotifyIDEConnected(_client: Client) {
  // no-op
}

export function hasAccessToIDEExtensionDiffFeature(
  _mcpClients: MCPServerConnection[],
): boolean {
  return false
}

export async function isIDEExtensionInstalled(
  _ideType: IdeType,
): Promise<boolean> {
  return false
}

export async function isCursorInstalled(): Promise<boolean> {
  return false
}

export async function isWindsurfInstalled(): Promise<boolean> {
  return false
}

export async function isVSCodeInstalled(): Promise<boolean> {
  return false
}

export async function detectRunningIDEs(): Promise<IdeType[]> {
  return []
}

export async function detectRunningIDEsCached(): Promise<IdeType[]> {
  return []
}

export function resetDetectRunningIDEs(): void {
  // no-op
}

export function getConnectedIdeName(
  _mcpClients: MCPServerConnection[],
): string | null {
  return null
}

export function getIdeClientName(
  _ideClient?: MCPServerConnection,
): string | null {
  return null
}

export function toIDEDisplayName(_terminal: string | null): string {
  return 'IDE'
}

export function getConnectedIdeClient(
  _mcpClients?: MCPServerConnection[],
): ConnectedMCPServer | undefined {
  return undefined
}

export async function closeOpenDiffs(
  _ideClient: ConnectedMCPServer,
): Promise<void> {
  // no-op
}

export async function initializeIdeIntegration(
  _onIdeDetected: (ide: DetectedIDEInfo | null) => void,
  _ideToInstallExtension: IdeType | null,
  _onShowIdeOnboarding: () => void,
  _onInstallationComplete: (status: IDEExtensionInstallationStatus | null) => void,
): Promise<void> {
  // no-op
}

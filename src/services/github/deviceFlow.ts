// Stub: GitHub device flow service removed
export const DEFAULT_GITHUB_DEVICE_FLOW_CLIENT_ID = ''
export const GITHUB_DEVICE_CODE_URL = ''
export const GITHUB_DEVICE_ACCESS_TOKEN_URL = ''
export const COPILOT_TOKEN_URL = ''
export const DEFAULT_GITHUB_DEVICE_SCOPE = ''
export const COPILOT_HEADERS: Record<string, string> = {}
export class GitHubDeviceFlowError extends Error {}
export async function getGithubDeviceFlowClientId(): Promise<string> { return '' }
export async function requestDeviceCode(): Promise<never> { throw new Error('GitHub device flow removed') }
export async function pollAccessToken(): Promise<never> { throw new Error('GitHub device flow removed') }
export async function openVerificationUri(): Promise<void> {}
export async function exchangeForCopilotToken(): Promise<never> { throw new Error('GitHub device flow removed') }

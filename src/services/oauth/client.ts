// Stub: OAuth service removed
export function isOAuthTokenExpired(): boolean { return false }
export async function refreshOAuthToken(): Promise<boolean> { return false }
export function storeOAuthAccountInfo() {}
export async function populateOAuthAccountInfoIfNeeded() {}
export function shouldUseClaudeAIAuth(): boolean { return false }
export async function createAndStoreApiKey(): Promise<never> { throw new Error('OAuth removed') }
export async function fetchAndStoreUserRoles(): Promise<never> { throw new Error('OAuth removed') }

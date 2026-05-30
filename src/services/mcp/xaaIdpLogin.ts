// Stub: XAA IdP Login removed
export function isXaaEnabled(): boolean { return false }
export function getXaaIdpSettings(): undefined { return undefined }
export function issuerKey(_issuer: string): string { return '' }
export function getCachedIdpIdToken(_issuer: string): undefined { return undefined }
export function saveIdpIdTokenFromJwt() {}
export function clearIdpIdToken(_issuer: string): void {}
export function saveIdpClientSecret() {}
export function getIdpClientSecret(_issuer: string): undefined { return undefined }
export function clearIdpClientSecret(_issuer: string): void {}
export async function discoverOidc(): Promise<never> { throw new Error('XAA IdP removed') }
export async function acquireIdpIdToken(): Promise<never> { throw new Error('XAA IdP removed') }

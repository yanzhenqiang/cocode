// Stub: XAA IdP Login removed
export function isXaaEnabled(): boolean { return false }
export function getXaaIdpSettings(): undefined { return undefined }
export function getCachedIdpIdToken(_issuer: string): undefined { return undefined }
export function clearIdpIdToken(_issuer: string): void {}
export function getIdpClientSecret(_issuer: string): undefined { return undefined }
export async function discoverOidc(): Promise<never> { throw new Error('XAA IdP removed') }
export async function acquireIdpIdToken(): Promise<never> { throw new Error('XAA IdP removed') }

// Stub: OS keychain storage removed. Use env vars for credentials.
export interface SecureStorageData {
  codex?: any
  mcpOAuth?: Record<string, any>
  mcpOAuthClientConfig?: Record<string, any>
  trustedDeviceToken?: string
  pluginSecrets?: Record<string, any>
}

const noopStorage = {
  name: 'stub-secure-storage',
  read: () => null as SecureStorageData | null,
  readAsync: async () => null as SecureStorageData | null,
  update: () => ({ success: false, warning: 'Secure storage unavailable' }),
  delete: () => true,
}

export function getSecureStorage() { return noopStorage }

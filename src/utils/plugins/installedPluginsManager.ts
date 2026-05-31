// Stub: plugin installation tracking removed
export function loadInstalledPluginsV2(): any { return { plugins: {}, updatedAt: '' } }
export function isPluginInstalled(): boolean { return false }
export function isPluginGloballyInstalled(): boolean { return false }
export async function initializeVersionedPlugins(): Promise<void> {}
export function loadInstalledPluginsFromDisk(): any { return { plugins: {}, updatedAt: '' } }
export function getInMemoryInstalledPlugins(): any { return { plugins: {}, updatedAt: '' } }
export function clearInstalledPluginsCache() {}
export function hasPendingUpdates(): boolean { return false }
export function getPendingUpdateCount(): number { return 0 }
export function getPendingUpdatesDetails(): any[] { return [] }

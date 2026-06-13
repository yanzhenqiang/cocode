export function getMdmSettings(): { settings: Record<string, unknown> } { return { settings: {} } }
export function getHkcuSettings(): { settings: Record<string, unknown> } { return { settings: {} } }
export function ensureMdmSettingsLoaded(): Promise<void> { return Promise.resolve() }
export function refreshMdmSettings(): Promise<{ mdm: { settings: Record<string, unknown> } }> { return Promise.resolve({ mdm: { settings: {} } }) }
export function setMdmSettingsCache(): void {}
export function hasMdmSettingsFile(): boolean { return false }
export class MdmChangeNotifier { subscribe() { return () => {} } }

export function getMdmSettings(): { settings: Record<string, unknown>; errors: never[] } { 
  return { settings: {}, errors: [] } 
}
export function getHkcuSettings(): { settings: Record<string, unknown>; errors: never[] } { 
  return { settings: {}, errors: [] } 
}
export function ensureMdmSettingsLoaded(): Promise<void> { return Promise.resolve() }
export function refreshMdmSettings(): Promise<{ mdm: { settings: Record<string, unknown>; errors: never[] } }> { 
  return Promise.resolve({ mdm: { settings: {}, errors: [] } }) 
}
export function setMdmSettingsCache(): void {}
export function hasMdmSettingsFile(): boolean { return false }
export class MdmChangeNotifier { subscribe() { return () => {} } }

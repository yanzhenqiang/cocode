// Stub: nativeInstaller removed
export type PackageManager = string
export async function getPackageManager(): Promise<PackageManager> { return 'npm' }
export function detectMise(): boolean { return false }
export function detectAsdf(): boolean { return false }
export function detectHomebrew(): boolean { return false }
export function detectWinget(): boolean { return false }
export const detectPacman = async (): Promise<boolean> => false
export const detectDeb = async (): Promise<boolean> => false
export const detectRpm = async (): Promise<boolean> => false
export const detectApk = async (): Promise<boolean> => false

// External build: terminal recording is not available.
// Keep this module as a stable no-op surface so runtime imports stay valid.

export function _resetRecordingStateForTesting(): void {}

export async function renameRecordingForSession(): Promise<void> {}

export async function flushAsciicastRecorder(): Promise<void> {}

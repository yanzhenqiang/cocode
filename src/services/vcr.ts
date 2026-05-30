// Stub: VCR (test recording) removed — pass-through only
export async function withVCR<T>(
  _label: string,
  fn: () => Promise<T>,
  _opts?: any,
): Promise<T> {
  return fn()
}

export async function* withStreamingVCR<T>(
  _messages: any,
  generator: () => AsyncGenerator<T>,
  _opts?: any,
): AsyncGenerator<T> {
  yield* generator()
}

export async function withTokenCountVCR<T>(
  _label: string,
  fn: () => Promise<T>,
): Promise<T> {
  return fn()
}

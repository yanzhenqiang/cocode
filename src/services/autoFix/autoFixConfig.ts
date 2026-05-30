// Stub: autoFix removed
import { z } from 'zod/v4'
export const AutoFixConfigSchema = z.object({ enabled: z.boolean() })
export type AutoFixConfig = z.infer<typeof AutoFixConfigSchema>
export function getAutoFixConfig(): AutoFixConfig { return { enabled: false } }

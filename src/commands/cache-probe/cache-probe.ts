import type { LocalCommandCall } from '../../types/command.js'

export const call: LocalCommandCall = async () => {
  return {
    type: 'text',
    value: 'cache-probe is disabled in this build.',
  }
}

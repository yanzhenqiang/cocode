import type { Command } from '../../commands.js'

const cacheProbe: Command = {
  type: 'local',
  name: 'cache-probe',
  description:
    'Send identical requests to test prompt caching (results in debug log)',
  argumentHint: '[model] [--no-key]',
  isEnabled: () => false,
  supportsNonInteractive: false,
  load: () => import('./cache-probe.js'),
}

export default cacheProbe

import type { Command } from '../../commands.js'

const shiftTab: Command = {
  type: 'local-jsx',
  name: 'shift-tab',
  description: 'Cycle through permission modes (default → acceptEdits → plan → bypass)',
  aliases: ['sm'],
  load: () => import('./shiftTabImpl.js'),
}

export default shiftTab

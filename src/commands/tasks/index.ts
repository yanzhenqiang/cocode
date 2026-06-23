import type { Command } from '../../commands.js'

const tasks = {
  type: 'local-jsx',
  name: 'tasks',
  description: 'List and manage background tasks',
  load: () => import('./tasks.js'),
} satisfies Command

export default tasks

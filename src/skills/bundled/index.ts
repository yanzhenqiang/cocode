import { registerAgentSkill } from './agent.js'
import { registerDebugSkill } from './debug.js'
import { registerExploreSkill } from './explore.js'
import { registerPlanSkill } from './plan.js'

/**
 * Initialize all bundled skills.
 * Called at startup to register skills that ship with the CLI.
 */
export function initBundledSkills(): void {
  registerAgentSkill()
  registerExploreSkill()
  registerPlanSkill()
  registerDebugSkill()
}

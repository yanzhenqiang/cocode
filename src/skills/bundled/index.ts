import { registerAgentSkill } from './agent.js'
import { registerBatchSkill } from './batch.js'
import { registerDebugSkill } from './debug.js'
import { registerExploreSkill } from './explore.js'
import { registerGuideSkill } from './guide.js'
import { registerKeybindingsSkill } from './keybindings.js'
import { registerPlanSkill } from './plan.js'
import { registerUpdateConfigSkill } from './updateConfig.js'

/**
 * Initialize all bundled skills.
 * Called at startup to register skills that ship with the CLI.
 */
export function initBundledSkills(): void {
  registerAgentSkill()
  registerExploreSkill()
  registerPlanSkill()
  registerGuideSkill()
  registerUpdateConfigSkill()
  registerKeybindingsSkill()
  registerDebugSkill()
  registerBatchSkill()
}

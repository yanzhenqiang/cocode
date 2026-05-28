import { feature } from 'bun:bundle'
import { registerAgentSkill } from './agent.js'
import { registerBatchSkill } from './batch.js'
import { registerDebugSkill } from './debug.js'
import { registerExploreSkill } from './explore.js'
import { registerGuideSkill } from './guide.js'
import { registerKeybindingsSkill } from './keybindings.js'
import { registerLoopSkill } from './loop.js'
import { registerPlanSkill } from './plan.js'
import { registerSimplifySkill } from './simplify.js'
import { registerStatuslineSkill } from './statusline.js'
import { registerUpdateConfigSkill } from './updateConfig.js'
import { registerVerifySkill } from './verify.js'

/**
 * Initialize all bundled skills.
 * Called at startup to register skills that ship with the CLI.
 *
 * To add a new bundled skill:
 * 1. Create a new file in src/skills/bundled/ (e.g., myskill.ts)
 * 2. Export a register function that calls registerBundledSkill()
 * 3. Import and call that function here
 */
export function initBundledSkills(): void {
  registerAgentSkill()
  registerExploreSkill()
  registerPlanSkill()
  registerVerifySkill()
  registerGuideSkill()
  registerStatuslineSkill()
  registerUpdateConfigSkill()
  registerKeybindingsSkill()
  registerDebugSkill()
  registerSimplifySkill()
  registerBatchSkill()
  if (feature('REVIEW_ARTIFACT')) {
    /* eslint-disable @typescript/no-require-imports */
    const { registerHunterSkill } = require('./hunter.js')
    /* eslint-enable @typescript/no-require-imports */
    registerHunterSkill()
  }
  // /loop's isEnabled delegates to isKairosCronEnabled() — registered
  // unconditionally so the static import is bundled; visibility is gated
  // at runtime by the isEnabled callback.
  registerLoopSkill()
  if (feature('AGENT_TRIGGERS_REMOTE')) {
    /* eslint-disable @typescript/no-require-imports */
    const {
      registerScheduleRemoteAgentsSkill,
    } = require('./scheduleRemoteAgents.js')
    /* eslint-enable @typescript/no-require-imports */
    registerScheduleRemoteAgentsSkill()
  }
  if (feature('BUILDING_CLAUDE_APPS')) {
    /* eslint-disable @typescript/no-require-imports */
    const { registerClaudeApiSkill } = require('./claudeApi.js')
    /* eslint-enable @typescript/no-require-imports */
    registerClaudeApiSkill()
  }
  if (feature('RUN_SKILL_GENERATOR')) {
    /* eslint-disable @typescript/no-require-imports */
    const { registerRunSkillGeneratorSkill } = require('./runSkillGenerator.js')
    /* eslint-enable @typescript/no-require-imports */
    registerRunSkillGeneratorSkill()
  }
}

#!/usr/bin/env npx tsx
/**
 * 动态执行追踪器：在 dist 中给所有 export function 注入 console.error trace
 * Usage: 先 build，再 npx tsx scripts/trace-all.ts，然后运行 cocode
 */
import { readFileSync, writeFileSync } from 'fs';

const DIST = '/data/data/com.termux/files/home/cocode/dist/cli.mjs';
let content = readFileSync(DIST, 'utf-8');

const exports: string[] = [];
const re = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
let m: RegExpExecArray | null;
while ((m = re.exec(content)) !== null) {
  exports.push(m[1]!);
}

console.log(`找到 ${exports.length} 个函数，注入 trace...`);

let count = 0;
// 只追踪我们关心的模块中的函数
const TRACE_MODULES = [
  'launchRepl', 'renderAndRun', 'showSetupScreens', 'PromptInput',
  'getInitialSettings', 'getSettingsForSource', 'getSettingsWithErrors',
  'loadSettingsFromDisk', 'enableConfigs', 'setupGracefulShutdown',
  'isScratchpadEnabled', 'ensureScratchpadDir', 'configureGlobalAgents',
  'applySafeConfigEnvironmentVariables', 'applyConfigEnvironmentVariables',
  'getCommands', 'getTools', 'initSessionMemory', 'initializeWarningHandler',
  'getInitialMainLoopModel', 'initializeToolPermissionContext',
  'initSinks', 'setup', 'setCwd', 'initializeEntrypoint', 'eagerLoadSettings',
  'initializeGrowthBook', 'initializeAnalyticsGates', 'initBundledSkills',
  'prefetchAllMcpResources', 'prefetchOfficialMcpUrls', 'fetchBootstrapData',
  'launchResumeChooser', 'launchInvalidSettingsDialog', 'launchAssistantInstallWizard',
  'getClaudeCodeMcpConfigs', 'getInitialSettings', 'getSettingsWithErrors',
  'resetSettingsCache', 'parseSettingsFile',
  'loadSkillsFromSkillsDir', 'getSkillDirCommands',
  'getProjectInstructionFilePath', 'processMemoryFile',
  'getGlobalConfig', 'saveGlobalConfig', 'getCurrentProjectConfig',
  'checkHasTrustDialogAccepted', 'checkAndRestoreTerminalBackup',
  'prefetchApiKeyFromApiKeyHelperIfSafe',
];

// 使用更精确的正则：function name(args) {
for (const fn of TRACE_MODULES) {
  const fnRe = new RegExp(`(function\\s+${fn}\\s*\\([^)]*\\)\\s*)\\{`, 'g');
  content = content.replace(fnRe, (match, prefix) => {
    count++;
    return `${prefix}{console.error("[TRACE] ${fn}()");`;
  });
}

writeFileSync(DIST, content);
console.log(`Injected ${count} traces.`);
console.log('\nRun: cocode 2>&1 | grep TRACE');

// Cocode: polyfill globalThis.File for Node < 20.
// undici v7 references `File` at module evaluation time (webidl type
// assertions). Node 18 lacks the global, causing a ReferenceError inside
// the bundled __commonJS require chain which deadlocks the process when a
// proxy is configured (configureGlobalAgents → require_undici).
// eslint-disable-next-line custom-rules/no-top-level-side-effects
if (typeof globalThis.File === 'undefined') {
  try {
    // Node 18.13+ exposes File in node:buffer but not as a global.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File: NodeFile } = require('node:buffer')
    // @ts-expect-error -- polyfilling missing global
    globalThis.File = NodeFile
  } catch {
    // Absolute fallback: stub so `MakeTypeAssertion(File)` doesn't throw.
    // @ts-expect-error -- minimal polyfill
    globalThis.File = class File extends Blob {
      name: string
      lastModified: number
      constructor(parts: BlobPart[], name: string, opts?: FilePropertyBag) {
        super(parts, opts)
        this.name = name
        this.lastModified = opts?.lastModified ?? Date.now()
      }
    }
  }
}

// Cocode: disable experimental API betas by default.
// Tool search (defer_loading), global cache scope, and context management
// require internal API support not available to external accounts → 500.
// Users can opt-in with CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=false.
// eslint-disable-next-line custom-rules/no-top-level-side-effects
process.env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS ??= 'true'

// Bugfix for corepack auto-pinning, which adds yarnpkg to peoples' package.jsons
// eslint-disable-next-line custom-rules/no-top-level-side-effects
process.env.COREPACK_ENABLE_AUTO_PIN = '0';

// Set max heap size for child processes in CCR environments (containers have 16GB)
// eslint-disable-next-line custom-rules/no-top-level-side-effects, custom-rules/no-process-env-top-level, custom-rules/safe-env-boolean-check

// Harness-science L0 ablation baseline. Inlined here (not init.ts) because
/**
 * Bootstrap entrypoint - checks for special flags before loading the full CLI.
 * All imports are dynamic to minimize module evaluation for fast paths.
 * Fast-path for --version has zero imports beyond this file.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Fast-path for --version/-v: zero module loading needed
  if (args.length === 1 && (args[0] === '--version' || args[0] === '-v' || args[0] === '-V')) {
    // MACRO.VERSION is inlined at build time
    // biome-ignore lint/suspicious/noConsole:: intentional console output
    console.log(`${MACRO.DISPLAY_VERSION ?? MACRO.VERSION} (Cocode)`);
    return;
  }

  // --provider: set provider env vars early so saved-profile resolution,
  // validation, and the startup banner all see the intended provider/model.
  if (args.includes('--provider')) {
    const { applyProviderFlagFromArgs } = { applyProviderFlagFromArgs: (args: string[]) => ({ error: '' } as { error?: string }) };
    const result = applyProviderFlagFromArgs(args);
    if (result?.error) {
      // biome-ignore lint/suspicious/noConsole:: intentional error output
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  }

  // Enable configs first so we can read settings
  {
    const { enableConfigs } = await import('../utils/config.js')
    enableConfigs()
  }

  // Apply settings.env from user settings (includes GitHub provider settings from /onboard-github)
  {
    const { applySafeConfigEnvironmentVariables } = await import('../utils/managedEnv.js')
    applySafeConfigEnvironmentVariables()
  }

  // #808: --model alone (no --provider) — route to the env var matching the
  // active provider before the banner prints so the override is visible.
  if (args.includes('--model')) {
    const { applyModelFlagFromArgs } = { applyModelFlagFromArgs: (args: string[]) => {} }
    applyModelFlagFromArgs(args)
  }

  // Parse --model early so the startup screen can display the override
  const { eagerParseCliFlag } = await import('../utils/cliArgs.js')
  const earlyModelFlag = eagerParseCliFlag('--model')

  // Print model info
  const { printStartupScreen } = await import('../components/StartupScreen.js')
  printStartupScreen(earlyModelFlag)

  // For all other paths, load the startup profiler
  const {

  } = await import('../utils/startupProfiler.js');




  // No special flags detected, load and run the full CLI
  if (process.env.COCODE_DISABLE_EARLY_INPUT !== '1') {
    const {
      startCapturingEarlyInput
    } = await import('../utils/earlyInput.js');
    startCapturingEarlyInput();
  }

  const {
    main: cliMain
  } = await import('../main.js');

  await cliMain();

}

// eslint-disable-next-line custom-rules/no-top-level-side-effects
void main();

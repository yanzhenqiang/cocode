/**
 * Cocode build script — bundles the TypeScript source into a single
 * distributable JS file using esbuild (Node.js compatible).
 *
 * Handles:
 * - feature() flags for the open build
 * - MACRO.* globals → inlined version/build-time constants
 * - src/ path aliases
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import * as esbuild from 'esbuild'
import { CLI_EXTERNALS, SDK_EXTERNALS } from './externals.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const version = pkg.version

// Feature flags for the open build.
// Any flag not listed here defaults to false.
const featureFlags: Record<string, boolean> = {
  BUILTIN_EXPLORE_PLAN_AGENTS: true,
  MONITOR_TOOL: true,
  MESSAGE_ACTIONS: true,
  DUMP_SYSTEM_PROMPT: true,
  CACHED_MICROCOMPACT: true,
  TRANSCRIPT_CLASSIFIER: false,
  ULTRATHINK: true,
  TOKEN_BUDGET: true,
  HISTORY_PICKER: true,
  QUICK_SEARCH: true,
  SHOT_STATS: true,
  FORK_SUBAGENT: true,
  PROMPT_CACHE_BREAK_DETECTION: true,
  HOOK_PROMPTS: true,
}

const featureCallRe = /\bfeature\(\s*['"](\w+)['"][,\s]*\)/gs
const featureImportRe = /import\s*\{[^}]*\bfeature\b[^}]*\}\s*from\s*['"]bun:bundle['"];?\s*\n?/g
const modifiedFiles = new Map<string, string>()

function preProcessFeatureFlags(dir: string) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name)
    if (ent.isDirectory()) { preProcessFeatureFlags(full); continue }
    if (!/\.(ts|tsx)$/.test(ent.name)) continue

    const raw = readFileSync(full, 'utf-8')
    if (!raw.includes('feature(')) continue

    let contents = raw
    contents = contents.replace(featureImportRe, '')
    contents = contents.replace(featureCallRe, (_match, name) =>
      String((featureFlags as Record<string, boolean>)[name] ?? false),
    )

    if (contents !== raw) {
      modifiedFiles.set(full, raw)
      writeFileSync(full, contents)
    }
  }
}

function restoreModifiedFiles() {
  for (const [path, original] of modifiedFiles) {
    writeFileSync(path, original)
  }
  modifiedFiles.clear()
}

preProcessFeatureFlags(join(__dirname, '..', 'src'))
const numModified = modifiedFiles.size

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    restoreModifiedFiles()
    process.exit(signal === 'SIGINT' ? 130 : 143)
  })
}

// Plugin: replace import.meta.dir with import.meta.dirname (Node.js 20+)
const importMetaDirPlugin: esbuild.Plugin = {
  name: 'import-meta-dir',
  setup(build) {
    build.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
      const text = readFileSync(args.path, 'utf-8')
      if (!text.includes('import.meta.dir')) return undefined
      const replaced = text.replace(/\bimport\.meta\.dir\b/g, 'import.meta.dirname')
      return { contents: replaced, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' }
    })
  },
}

// Shared plugin logic extracted from bun-bundle-shim
const internalFeatureStubModules = new Map([
  [
    '../cli/bg.js',
    `
export async function psHandler() { throw new Error("Background sessions are unavailable in the open build."); }
export async function logsHandler() { throw new Error("Background sessions are unavailable in the open build."); }
export async function attachHandler() { throw new Error("Background sessions are unavailable in the open build."); }
export async function killHandler() { throw new Error("Background sessions are unavailable in the open build."); }
export async function handleBgFlag() { throw new Error("Background sessions are unavailable in the open build."); }
`,
  ],
  [
    '../cli/handlers/templateJobs.js',
    'export async function templatesMain() { throw new Error("Template jobs are unavailable in the open build."); }',
  ],
  [
    '../environment-runner/main.js',
    'export async function environmentRunnerMain() { throw new Error("Environment runner is unavailable in the open build."); }',
  ],
  [
    '../self-hosted-runner/main.js',
    'export async function selfHostedRunnerMain() { throw new Error("Self-hosted runner is unavailable in the open build."); }',
  ],
] as const)

const nativeStubModules = [
  'audio-capture-napi',
  'audio-capture.node',
  'image-processor-napi',
  'modifiers-napi',
  'url-handler-napi',
  'color-diff-napi',
  '@anthropic-ai/mcpb',
  '@ant/claude-for-chrome-mcp',
  '@anthropic-ai/sandbox-runtime',
  'asciichart',
  'plist',
  'cacache',
  'fuse',
]

const nativeStubContents = `
const noop = () => null;
const noopClass = class {};
const handler = {
  get(_, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return new Proxy({}, handler);
    if (prop === 'SandboxRuntimeConfigSchema') return { parse: () => ({}) };
    return noop;
  }
};
const stub = new Proxy(noop, handler);
export default stub;
export const __stub = true;
export const SandboxViolationStore = null;
export const SandboxManager = new Proxy({}, { get: () => noop });
export const SandboxRuntimeConfigSchema = { parse: () => ({}) };
export const BROWSER_TOOLS = [];
export const getMcpConfigForManifest = noop;
export const ColorDiff = null;
export const ColorFile = null;
export const getSyntaxTheme = noop;
export const plot = noop;
export const createClaudeForChromeMcpServer = noop;
`

const textStubContents = `export default '';`

// Pre-scan for missing imports (same logic as original)
function scanForMissingImports(srcDir: string) {
  const missingModules = new Set<string>()
  const missingModuleExports = new Map<string, Set<string>>()

  for (const pkg of [
    '@ant/computer-use-mcp',
    '@ant/computer-use-mcp/sentinelApps',
    '@ant/computer-use-mcp/types',
    '@ant/computer-use-swift',
    '@ant/computer-use-input',
  ]) {
    missingModules.add(pkg)
  }

  function checkAndRegister(specifier: string, fileDir: string, namedPart: string) {
    const names = namedPart.split(',')
      .map((s: string) => s.trim().replace(/^type\s+/, ''))
      .filter((s: string) => s && !s.startsWith('type '))

    if (specifier.startsWith('src/tasks/')) {
      const resolved = resolve(fileDir, specifier)
      const candidates = [
        resolved,
        `${resolved}.ts`, `${resolved}.tsx`,
        resolved.replace(/\.js$/, '.ts'), resolved.replace(/\.js$/, '.tsx'),
        join(resolved, 'index.ts'), join(resolved, 'index.tsx'),
      ]
      if (!candidates.some((c: string) => existsSync(c))) {
        missingModules.add(specifier)
      }
    } else if (specifier.endsWith('.js') && (specifier.startsWith('./') || specifier.startsWith('../'))) {
      const resolved = resolve(fileDir, specifier)
      const tsVariant = resolved.replace(/\.js$/, '.ts')
      const tsxVariant = resolved.replace(/\.js$/, '.tsx')
      if (!existsSync(resolved) && !existsSync(tsVariant) && !existsSync(tsxVariant)) {
        missingModules.add(specifier)
      }
    }

    if (names.length > 0) {
      if (!missingModuleExports.has(specifier)) missingModuleExports.set(specifier, new Set())
      for (const n of names) missingModuleExports.get(specifier)!.add(n)
    }
  }

  function walk(dir: string) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, ent.name)
      if (ent.isDirectory()) { walk(full); continue }
      if (!/\.(ts|tsx)$/.test(ent.name)) continue
      const fileDir = dirname(full)
      const rawCode = readFileSync(full, 'utf-8')
      const code = rawCode
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')

      for (const m of code.matchAll(/import\s+(?:\{([^}]*)\}|(\w+))?\s*(?:,\s*\{([^}]*)\})?\s*from\s+['"](.*?)['"]/g)) {
        checkAndRegister(m[4], fileDir, m[1] || m[3] || '')
      }
      for (const m of code.matchAll(/require\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g)) {
        checkAndRegister(m[1], fileDir, '')
      }
      for (const m of code.matchAll(/import\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g)) {
        checkAndRegister(m[1], fileDir, '')
      }
    }
  }
  walk(srcDir)

  return { missingModules, missingModuleExports }
}

const srcDir = resolve(__dirname, '..', 'src')
const { missingModules, missingModuleExports } = scanForMissingImports(srcDir)

// Bundle shim plugin (CLI)
const bundleShimPlugin: esbuild.Plugin = {
  name: 'bun-bundle-shim',
  setup(build) {
    build.onResolve(
      { filter: /^\.\.\/(cli\/bg|cli\/handlers\/templateJobs|environment-runner\/main|self-hosted-runner\/main)\.js$/ },
      args => {
        if (!internalFeatureStubModules.has(args.path)) return undefined
        return {
          path: args.path,
          namespace: 'internal-feature-stub',
        }
      },
    )
    build.onLoad(
      { filter: /.*/, namespace: 'internal-feature-stub' },
      args => ({
        contents:
          internalFeatureStubModules.get(args.path) ??
          'export {}',
        loader: 'js',
      }),
    )

    build.onResolve({ filter: /^react\/compiler-runtime$/ }, () => ({
      path: 'react/compiler-runtime',
      namespace: 'react-compiler-shim',
    }))
    build.onLoad(
      { filter: /.*/, namespace: 'react-compiler-shim' },
      () => ({
        contents: `export function c(size) { return new Array(size).fill(Symbol.for('react.memo_cache_sentinel')); }`,
        loader: 'js',
      }),
    )

    for (const mod of nativeStubModules) {
      build.onResolve({ filter: new RegExp(`^${mod}$`) }, () => ({
        path: mod,
        namespace: 'native-stub',
      }))
    }
    build.onLoad(
      { filter: /.*/, namespace: 'native-stub' },
      () => ({
        contents: nativeStubContents,
        loader: 'js',
      }),
    )

    build.onResolve({ filter: /\.(md|txt)$/ }, (args) => ({
      path: args.path,
      namespace: 'text-stub',
    }))
    build.onLoad(
      { filter: /.*/, namespace: 'text-stub' },
      () => ({
        contents: textStubContents,
        loader: 'js',
      }),
    )

    for (const mod of missingModules) {
      const escaped = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      build.onResolve({ filter: new RegExp(`^${escaped}$`) }, () => ({
        path: mod,
        namespace: 'missing-module-stub',
      }))
    }

    build.onLoad(
      { filter: /.*/, namespace: 'missing-module-stub' },
      (args) => {
        const names = missingModuleExports.get(args.path) ?? new Set()
        const exports = [...names].map(n => `export const ${n} = noop;`).join('\n')
        return {
          contents: `
const noop = () => null;
export default noop;
${exports}
`,
          loader: 'js',
        }
      },
    )
  },
}

// SDK stub plugin
const sdkMissingModules = [
  '@anthropic-ai/mcpb',
  '@ant/claude-for-chrome-mcp',
  '@ant/computer-use-mcp',
  '@ant/computer-use-swift',
  '@ant/computer-use-input',
  '@anthropic-ai/sandbox-runtime',
  'audio-capture-napi', 'audio-capture.node',
  'image-processor-napi', 'modifiers-napi', 'url-handler-napi', 'color-diff-napi',
  'asciichart', 'plist', 'cacache', 'fuse',
]

function scanSdkRequireImports() {
  const sdkMissingRequires = new Set<string>()
  function walkRequireScan(dir: string) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, ent.name)
      if (ent.isDirectory()) { walkRequireScan(full); continue }
      if (!/\.(ts|tsx)$/.test(ent.name)) continue
      const fileDir = dirname(full)
      const rawCode = readFileSync(full, 'utf-8')
      const code = rawCode
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
      for (const m of code.matchAll(/require\(\s*['"](\.\.?\/[^'"]+\.js)['"]\s*\)/g)) {
        const specifier = m[1]
        const resolved = resolve(fileDir, specifier)
        const tsVariant = resolved.replace(/\.js$/, '.ts')
        if (!existsSync(resolved) && !existsSync(tsVariant)) {
          sdkMissingRequires.add(specifier)
        }
      }
    }
  }
  walkRequireScan(srcDir)
  return sdkMissingRequires
}

const sdkMissingRequires = scanSdkRequireImports()

const defaultExportOverrides: Record<string, string> = {
  'stringWidth': '(s) => s?.length || 0',
  'wrapAnsi': '(s) => s',
  'instances': 'new Map()',
  'selectableUserMessagesFilter': '() => true',
  'messagesAfterAreOnlySynthetic': '() => false',
  'SandboxManager': 'class { static isSupportedPlatform = () => false; static create = noop; static Version = \'\'; }',
  'SandboxRuntimeConfigSchema': '{ parse: noop }',
  'SandboxViolationStore': 'null',
  'BaseSandboxManager': 'class { static isSupportedPlatform = () => false; }',
  'ExportResultCode': '{ SUCCESS: 0, FAILED: 1 }',
  'linkifyUrlsInText': '(s) => s',
}

function scanSdkStubImports() {
  const sdkStubExports = new Map<string, Set<string>>()

  function register(specifier: string, namedPart: string) {
    const rawNames = namedPart.split(',')
      .map((s: string) => s.trim().replace(/^type\s+/, ''))
      .filter((s: string) => s && !s.startsWith('type '))
    if (rawNames.length === 0) return
    if (!sdkStubExports.has(specifier)) sdkStubExports.set(specifier, new Set())
    const names = sdkStubExports.get(specifier)!
    for (const s of rawNames) {
      const asMatch = s.match(/^(\w+)\s+as\s+(\w+)$/)
      if (asMatch) {
        names.add(asMatch[1])
        names.add(asMatch[2])
      } else {
        names.add(s)
      }
    }
  }

  const isStubbedSpecifier = (s: string) =>
    sdkMissingModules.includes(s) ||
    /^(\.\.?\/)+(components|ink|commands|cli|context|state|keybindings)\//.test(s) ||
    /^(\.\.?\/)+ink\.js$/.test(s) ||
    /^src\/(components|ink|commands|cli|state|context|keybindings)\//.test(s) ||
    /^src\/ink\.js$/.test(s) ||
    /(?:^|\/)UI\.js$/.test(s) ||
    s === 'react-compiler-runtime' ||
    /(?:^|\/)It2SetupPrompt\.js$/.test(s) ||
    /(?:^|\/)(useDoublePress|useExitOnCtrlCD|useExitOnCtrlCDWithKeybindings|useTerminalSize|useShortcutDisplay)\.js$/.test(s)

  function walk(dir: string) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, ent.name)
      if (ent.isDirectory()) { walk(full); continue }
      if (!/\.(ts|tsx)$/.test(ent.name)) continue
      const fileDir = dirname(full)
      const rawCode = readFileSync(full, 'utf-8')
      const code = rawCode
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
      for (const m of code.matchAll(/import\s+(?:\{([^}]*)\}|(\w+))?\s*(?:,\s*\{([^}]*)\})?\s*from\s+['"](.*?)['"]/g)) {
        const specifier = m[4]
        if (isStubbedSpecifier(specifier)) {
          register(specifier, m[1] || m[3] || '')
        }
      }
      for (const m of code.matchAll(/export\s+\{([^}]*)\}\s*from\s+['"](.*?)['"]/g)) {
        const specifier = m[2]
        if (isStubbedSpecifier(specifier)) {
          register(specifier, m[1])
        }
      }
      for (const m of code.matchAll(/export\s+\*\s+from\s+['"](.*?)['"]/g)) {
        const specifier = m[1]
        if (isStubbedSpecifier(specifier)) {
          const reexportPath = resolve(fileDir, specifier)
          const reexportBase = reexportPath.replace(/\.js$/, '')
          const candidates = [
            `${reexportBase}.ts`,
            `${reexportBase}.tsx`,
            reexportPath,
            `${reexportPath}.ts`,
            `${reexportPath}.tsx`,
          ]
          for (const candidate of candidates) {
            if (existsSync(candidate)) {
              const reexportCode = readFileSync(candidate, 'utf-8')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/.*$/gm, '')
              for (const exp of reexportCode.matchAll(/export\s+(?:const|let|var|function|class|type|interface)\s+(\w+)/g)) {
                register(specifier, exp[1])
              }
              for (const exp of reexportCode.matchAll(/export\s+\{([^}]*)\}/g)) {
                register(specifier, exp[1])
              }
              break
            }
          }
        }
      }
    }
  }
  walk(srcDir)
  return sdkStubExports
}

const sdkStubExports = scanSdkStubImports()

const sdkMissingStubPlugin: esbuild.Plugin = {
  name: 'sdk-missing-stub',
  setup(build) {
    for (const mod of sdkMissingModules) {
      const escaped = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      build.onResolve({ filter: new RegExp(`^${escaped}$`) }, () => ({
        path: mod,
        namespace: 'sdk-missing-stub',
      }))
    }

    build.onResolve({ filter: /^(\.\.?\/)+components\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^(\.\.?\/)+ink\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^(\.\.?\/)+commands\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^(\.\.?\/)+cli\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^(\.\.?\/)+state\// }, (args) => {
      const isReactFreeStateModule =
        args.path.endsWith('store.js') ||
        args.path.endsWith('AppStateStore.js') ||
        args.path.endsWith('store.ts') ||
        args.path.endsWith('AppStateStore.ts')
      if (isReactFreeStateModule) {
        return undefined
      }
      return {
        path: args.path,
        namespace: 'sdk-missing-stub',
      }
    })
    build.onResolve({ filter: /^(\.\.?\/)+context\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^(\.\.?\/)+ink\.js$/ }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^\.\/components\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^\.\/ink\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^\.\/commands\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^\.\/cli\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /(?:^|\/)UI\.js$/ }, (args) => {
      const importer = (args.importer || '').replace(/\\/g, '/')
      if (importer.includes('src/tools/')) {
        return {
          path: args.path,
          namespace: 'sdk-missing-stub',
        }
      }
      return undefined
    })
    build.onResolve({ filter: /^src\/components\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^src\/ink\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^src\/ink\.js$/ }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^src\/commands\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^src\/cli\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^src\/state\// }, (args) => {
      const isReactFreeStateModule =
        args.path.endsWith('store.js') ||
        args.path.endsWith('AppStateStore.js') ||
        args.path.endsWith('store.ts') ||
        args.path.endsWith('AppStateStore.ts')
      if (isReactFreeStateModule) {
        return undefined
      }
      return {
        path: args.path,
        namespace: 'sdk-missing-stub',
      }
    })
    build.onResolve({ filter: /^src\/context\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^src\/keybindings\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^(\.\.?\/)+keybindings\// }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))
    build.onResolve({ filter: /^react-compiler-runtime$/ }, () => ({
      path: 'react-compiler-runtime',
      namespace: 'sdk-missing-stub',
    }))

    for (const hookPath of [
      'useDoublePress.js', 'useExitOnCtrlCD.js', 'useExitOnCtrlCDWithKeybindings.js',
      'useTerminalSize.js', 'useShortcutDisplay.js',
    ]) {
      const escaped = hookPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      build.onResolve({ filter: new RegExp(`(^|/)${escaped}$`) }, (args) => ({
        path: args.path,
        namespace: 'sdk-missing-stub',
      }))
    }

    build.onResolve({ filter: /It2SetupPrompt\.js$/ }, (args) => ({
      path: args.path,
      namespace: 'sdk-missing-stub',
    }))

    build.onResolve({ filter: /^react\/jsx-dev-runtime$/ }, () => ({
      path: 'react/jsx-dev-runtime',
      namespace: 'sdk-jsx-stub',
    }))
    build.onLoad({ filter: /.*/, namespace: 'sdk-jsx-stub' }, () => ({
      contents: `
export function jsxDEV(type, props, key, isStaticChildren, source, self) {
  return null;
}
export const Fragment = null;
`,
      loader: 'js',
    }))

    build.onResolve({ filter: /\.(md|txt)$/, namespace: 'file' }, (args) => ({
      path: args.path,
      namespace: 'sdk-text-stub',
    }))
    build.onLoad(
      { filter: /.*/, namespace: 'sdk-text-stub' },
      () => ({
        contents: textStubContents,
        loader: 'js',
      }),
    )

    for (const mod of sdkMissingRequires) {
      const escaped = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      build.onResolve({ filter: new RegExp(`^${escaped}$`) }, () => ({
        path: mod,
        namespace: 'sdk-missing-stub',
      }))
    }

    build.onLoad({ filter: /.*/, namespace: 'sdk-missing-stub' }, (args) => {
      const names = sdkStubExports.get(args.path) ?? new Set()
      const parts: string[] = []
      for (const n of names) {
        if (n === 'default') continue
        const val = defaultExportOverrides[n] ?? 'noop'
        parts.push(`export const ${n} = ${val};`)
      }
      return {
        contents: `
const noop = () => null;
export default noop;
export const __stub = true;
${parts.join('\n')}
`,
        loader: 'js',
      }
    })
  },
}

// Shared define
const macroDefine = {
  'MACRO.VERSION': JSON.stringify('99.0.0'),
  'MACRO.DISPLAY_VERSION': JSON.stringify(version),
  'MACRO.BUILD_TIME': JSON.stringify(new Date().toISOString()),
  'MACRO.ISSUES_EXPLAINER':
    JSON.stringify('report the issue at https://github.com/Gitlawb/cocode/issues'),
  'MACRO.FEEDBACK_CHANNEL':
    JSON.stringify('https://github.com/Gitlawb/cocode/issues'),
  'MACRO.PACKAGE_URL': JSON.stringify('@gitlawb/cocode'),
  'MACRO.NATIVE_PACKAGE_URL': 'undefined',
}

const requireBanner = `import { createRequire as __cr } from 'module'; if (typeof require === 'undefined') { var require = __cr(import.meta.url); }`

let cliSuccess = false

try {
  // ── CLI Bundle Build ──────────────────────────────────────────────────────
  console.log(`Building CLI bundle...`)

  const cliResult = await esbuild.build({
    entryPoints: ['./src/entrypoints/cli.tsx'],
    outfile: './dist/cli.mjs',
    platform: 'node',
    target: 'es2023',
    format: 'esm',
    bundle: true,
    sourcemap: true,
    minify: false,
    define: macroDefine,
    external: CLI_EXTERNALS,
    jsx: 'automatic',
    banner: {
      js: requireBanner,
    },
  })

  if (cliResult.errors.length > 0) {
    console.error('CLI Build failed:')
    for (const err of cliResult.errors) {
      console.error(err)
    }
    process.exitCode = 1
  } else {
    cliSuccess = true
    console.log(`✓ Built cocode v${version} → dist/cli.mjs`)
  }

} finally {
  restoreModifiedFiles()
  console.log(`  🔄 feature-flags: pre-processed ${numModified} files (restored)`)
}

// ── Validate external lists ──────────────────────────────────────────────
if (cliSuccess) {
  console.log('\nValidating external lists...')
  const validation = spawnSync('npx', ['tsx', 'scripts/validate-externals.ts'], {
    stdio: 'inherit',
    shell: false,
  })
  if (validation.status !== 0) {
    process.exitCode = 1
  }
}

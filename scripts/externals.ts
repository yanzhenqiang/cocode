/**
 * Shared external dependency lists for CLI and SDK bundles.
 *
 * Used by build.ts and validate-externals.ts.
 * When adding a new dependency to package.json, check if it should be
 * added here (large packages, native modules, or packages with many exports).
 */

// Packages that should be kept external in ALL bundles (CLI + SDK)
export const COMMON_EXTERNALS: string[] = [
  // Native image processing
  'sharp',
  // @vscode/ripgrep ships a platform-specific binary alongside its
  // index.js and resolves the path via __dirname at runtime. Bundling
  // would freeze the build host's absolute path into dist/cli.mjs, so we
  // keep it external and rely on the npm package being installed.
  '@vscode/ripgrep',
]

// Additional packages external only in the SDK bundle (TUI + heavy deps)
export const SDK_ONLY_EXTERNALS: string[] = [
  'react',
  'react-reconciler',
  '@anthropic-ai/sdk',
  '@modelcontextprotocol/sdk',
]

// Packages kept external but NOT listed in package.json dependencies.
// These are dynamically imported at runtime — they're optional and resolved
// from transitive deps or installed by users who need that provider/protocol.
export const OPTIONAL_RUNTIME_EXTERNALS: string[] = []

// Computed full lists
export const CLI_EXTERNALS: string[] = COMMON_EXTERNALS
export const SDK_EXTERNALS: string[] = [...COMMON_EXTERNALS, ...SDK_ONLY_EXTERNALS]

// Packages intentionally bundled (not external, not flagged by validation)
// These are small utilities that are fine to inline into the output bundle.
export const INTENTIONALLY_BUNDLED: string[] = [
  // CLI / TUI utilities
  '@alcalzone/ansi-tokenize',
  '@commander-js/extra-typings',
  'bidi-js',
  'chalk',
  'cli-boxes',
  'commander',
  'emoji-regex',
  'env-paths',
  'figures',
  'get-east-asian-width',
  'indent-string',
  'strip-ansi',
  'supports-hyperlinks',
  'wrap-ansi',
  // Data formats
  'jsonc-parser',
  'yaml',
  'cli-highlight',
  'marked',
  'turndown',
  'xss',
  // Data utilities
  'ajv',
  'auto-bind',
  'diff',
  'fuse.js',
  'ignore',
  'lodash-es',
  'lru-cache',
  'p-map',
  'picomatch',
  'proper-lockfile',
  'semver',
  'shell-quote',
  'signal-exit',
  'type-fest',
  // Networking
  'axios',
  'cross-spawn',
  'duck-duck-scrape',
  '@mendable/firecrawl-js',
  'execa',
  'https-proxy-agent',
  'tree-kill',
  'undici',
  'ws',
  // React ecosystem (react/react-reconciler are SDK_ONLY_EXTERNALS, bundled in CLI)
  'react',
  'react-compiler-runtime',
  'react-reconciler',
  'usehooks-ts',
  // Anthropic SDK (external in SDK bundle, bundled in CLI)
  '@anthropic-ai/sdk',
  // MCP SDK (external in SDK bundle, bundled in CLI)
  '@modelcontextprotocol/sdk',
  // Schema validation
  'zod',
    // File watching
  'chokidar',
]

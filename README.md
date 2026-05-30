# Cocode

Cocode is a coding-agent CLI for cloud and local model providers.

## Development Workflow

After every code change, run this sequence:

```bash
# 1. Bump version in package.json
# 2. Rebuild and reinstall globally
npm run build
npm link

# 3. Run smoke test
npm run smoke

# 4. If smoke passes, commit
git add -A
git commit -m "describe your change"
```

## Code Hygiene

Run `unimport` regularly to remove dead imports and unused code:

```bash
npx unimport --include "src/**/*.{ts,tsx}" --write
```

This keeps the codebase lean by auto-detecting and stripping unused imports, variables, and functions. Run before major commits or after large refactors.

## Environment Setup

Copy API credentials from `cocode.sh`:

```bash
source <(sed '/^exec /d' cocode.sh)
```

Then run:

```bash
cocode
```

## Build

Requires Node.js ≥22. Uses esbuild (no Bun needed):

```bash
npm install
npm run build
```

Output: `dist/cli.mjs`

## Smoke Test

```bash
bash test_smoke.sh
```

Requires `tmux` and a valid API key in environment.

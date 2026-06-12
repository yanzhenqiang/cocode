# Cocode Development Guidelines

## Test Result Naming Convention

All test results must be saved as markdown files following this format:

```
TEST_<NAME>_RESULT_<COMMIT>.md
```

### Rules

- `TEST_` prefix (uppercase)
- `<NAME>`: the test name (e.g., `SMOKE`, `SUB_AGENT`)
- `_RESULT_` separator (uppercase)
- `<COMMIT>`: short commit hash (7 characters)
- `.md` suffix

### Examples

- `TEST_SMOKE_RESULT_9444540.md`
- `TEST_SUB_AGENT_RESULT_9068A5A.md`

### Content Template

Each result file must include:

1. **测试时间** (test timestamp)
2. **版本** (version number)
3. **Commit** (full or short commit hash)
4. **测试场景** (test scenario description)
5. **测试结果** (pass/fail table with all checkpoints)
6. **回归验证** (regression test notes if applicable)
7. **环境信息** (platform, tmux version, Node.js version)

### File Location

Place result files in the repository root, alongside the corresponding `TEST_*.md` test plan files.

## Test Rules

**Never modify test files without explicit user discussion and approval.**
Tests are the user's verification baseline. Any change to test scripts,
test timeouts, or test logic must be discussed with the user first.

## Dead Code Deletion: Leaf-First Methodology

**Golden rule: never stub. Delete from leaves up.**

### Why not stub?

Stubs create maintenance debt — future readers don't know if the stub is intentional or an oversight. Deleted code can always be recovered from git history.

### The leaf-first approach

A "leaf" is a piece of code with no incoming dependencies — nobody calls it. Functions are the easiest leaves to find and remove.

### Step-by-step process

1. **Find a leaf function** — a function exported/defined but never called. Verify by grepping the entire codebase for call sites (exclude the definition itself).

2. **If the function IS called somewhere** — go to each call site first. Delete or simplify the calling code, rebuild, test. Then re-check if the function is now a leaf.

3. **Delete the leaf function** — only after all call sites are cleaned. Rebuild, test.

4. **Repeat** — work upward from leaves to trunk. Each deletion exposes new leaves (the functions that used to call the deleted code may themselves become unused).

5. **Finally: clean imports and variables in one pass** — after all function-level deletions are done, unused imports and dead variables are obvious. Use automated tools:

```
# Remove unused imports (TypeScript)
npx tsx scripts/build-node.ts 2>&1  # check build errors first

# For unused variables: eslint can auto-fix
npx eslint --fix src/ 2>/dev/null

# Or use ts-prune / knip to find dead exports
npx knip
```

### Example workflow

```
# Find export with few consumers
grep -r "functionName" src/ --include='*.ts' --include='*.tsx'

# Delete all call sites first
# ... (edit each file, remove the calls)

# Then delete the function definition
# Rebuild and test after EACH deletion

# Finally: auto-clean imports
npx eslint --fix src/
```

### Why this beats stub-first

| Approach | Lines | Maintenance | Reversible |
|----------|-------|-------------|------------|
| Stub | +N (stub code) | Forever | No signal |
| Delete | -M (dead code) | Git history | `git revert` |

Stubs accumulate. Deletions compound. Choose deletion.

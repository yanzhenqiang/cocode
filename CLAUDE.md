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

## delete_func.ts — AST-Based Function Deletion

Located at `scripts/delete_func.ts`. Takes a function name, traces all its call sites via TypeScript AST, and deletes everything cleanly.

### Usage

```bash
npx tsx scripts/delete_func.ts <函数名>        # show reference tree
npx tsx scripts/delete_func.ts <函数名> --delete  # execute deletion
npx tsx scripts/delete_func.ts --list-dead     # list all dead functions
```

### What it deletes (per function)

1. **Definition body** — exact AST span, including leading/trailing whitespace
2. **Import specifiers** — removes `import { X }` from all importing files. If multi-member import, removes only X. If import line becomes empty, deletes whole line.
3. **Call sites** — deletes every call line, cross-file and same-file.
4. **Dependencies** — recursively deletes callees that have no remaining callers after X is removed (leaf-first).

### Simple vs Complex Calls

| Pattern | Auto-delete? | Reason |
|---------|-------------|--------|
| `X()` | ✅ Yes | No downstream effects |
| `void X()` | ✅ Yes | Same as above |
| `const r = X()` → `if(!r) return` | ✅ Yes | r becomes undefined, guard handles it |
| `const r = X()` → r used elsewhere | ❌ Manual | Must trace r's full usage chain |

### Key design decisions

- **Root-only mode**: By default only deletes the root function, not dependencies. Dependency cascade must be enabled explicitly.
- **String literals are safe**: `logForDebugging('[init] X starting')` — the tool understands `'[init] X starting'` is a string, not a reference to function X.
- **Multi-member imports handled**: `import { X, Y } from './foo'` → deletes only X, keeps Y.
- **Round-trip safety**: File is parsed, modified spans applied in reverse order (preserving positions), written back.

### Verification workflow

```
# Delete → Build → Test → Commit
npx tsx scripts/delete_func.ts "funcName" --delete
npx tsx scripts/build-node.ts
bash test_subagent.sh          # must pass 10/10
git add -A && git commit -m "删除 funcName (简单调用)"
git push origin main
```

### Test script

`test_subagent.sh` auto-rebuilds before testing and cleans up tmux sessions. Always runs `npx tsx scripts/build-node.ts` first.

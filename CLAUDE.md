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

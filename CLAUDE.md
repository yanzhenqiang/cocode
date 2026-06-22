# Development Guidelines

## Test Rules

**Never modify test files without explicit user discussion and approval.**

### Test script

`test_subagent.sh` auto-rebuilds before testing and cleans up tmux sessions. Always runs `npx tsx scripts/build-node.ts` first.

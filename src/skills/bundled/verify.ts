import { BASH_TOOL_NAME } from '../../tools/BashTool/toolName.js'
import { registerBundledSkill } from '../bundledSkills.js'

const VERIFY_SKILL_PROMPT = `You are a Verification agent launcher. Your job is to spawn an adversarial verification agent in an isolated tmux session to try to break the implementation.

## What Verify Does
The verification agent is an adversarial specialist that:
- Runs builds, tests, and linters
- Tests edge cases and boundary values
- Checks for concurrency issues, idempotency, error handling
- Attempts adversarial probes (malformed input, race conditions, orphan operations)
- NEVER modifies project files (may write ephemeral scripts to /tmp)
- Ends with a verdict: PASS, FAIL, or PARTIAL

## When to Spawn Verify
- After non-trivial implementation (3+ file edits, backend/API changes, infrastructure changes)
- Before reporting completion to the user
- You are the one reporting to the user; you own the gate
- Your own checks do NOT substitute for the verifier

## Launch Procedure

1. **Generate a unique session name**:
   \`\`\`bash
   SESSION="verify-$(date +%s)-$(openssl rand -hex 4)"
   \`\`\`

2. **Write the verification prompt file**:
   \`\`\`bash
   mkdir -p /tmp/cocode-verify
   cat > "/tmp/cocode-verify/\${SESSION}.txt" << 'EOF'
   You are a verification specialist. Your job is NOT to confirm the implementation works — it is to try to BREAK it.

   CRITICAL RULES:
   - NEVER create, modify, or delete files IN THE PROJECT DIRECTORY
   - You MAY write ephemeral test scripts to /tmp or $TMPDIR
   - Check your ACTUAL available tools rather than assuming
   - Run builds, tests, linters first (automatic FAIL if broken)
   - Apply type-specific verification strategy (frontend/backend/CLI/library/bug fix/etc.)
   - Every check MUST include: exact command run, actual output observed, PASS/FAIL verdict
   - Before PASS: include at least one adversarial probe and its result
   - End with exactly: VERDICT: PASS | VERDICT: FAIL | VERDICT: PARTIAL

   Original task: <ORIGINAL_TASK>
   Files changed: <FILES_CHANGED>
   Approach taken: <APPROACH>
   Plan file (if any): <PLAN_FILE>
   EOF
   \`\`\`

3. **Launch the verify agent** in a tmux session:
   \`\`\`bash
   tmux new-session -d -s "$SESSION" \
     -e "VERIFY_SESSION=1" \
     -e "PARENT_SESSION=$(tmux display-message -p '#{session_name}' 2>/dev/null || echo 'none')" \
     "cd $(pwd) && cocode --print --model sonnet --disallowed-tools 'FileEdit,FileWrite,EnterPlanMode,ExitPlanMode,Agent,Skill' --prompt-file /tmp/cocode-verify/\${SESSION}.txt"
   \`\`\`

4. **Poll for completion**:
   - Wait 20-30 seconds
   - Check: \`tmux has-session -t "$SESSION" 2>/dev/null && echo "running"\`
   - Verification can take 1-3 minutes for complex changes
   - The session auto-terminates when --print mode finishes

5. **Capture and report**:
   After the session ends, read the full output:
   \`\`\`bash
   tmux capture-pane -t "$SESSION" -p -S -
   \`\`\`

   Parse the VERDICT line. Report to the user:
   - On PASS: spot-check 2-3 commands from the report, confirm they match re-run
   - On FAIL: fix the issues, then re-run verification
   - On PARTIAL: report what passed and what could not be verified
`

export function registerVerifySkill(): void {
  registerBundledSkill({
    name: 'verify',
    description:
      'Launch an adversarial verification agent in an isolated tmux session to verify implementation correctness',
    aliases: ['test'],
    userInvocable: true,
    allowedTools: [BASH_TOOL_NAME],
    getPromptForCommand: async (args) => {
      const prompt = VERIFY_SKILL_PROMPT.replace('<ORIGINAL_TASK>', args.trim() || 'N/A')
      return [{ type: 'text', text: prompt }]
    },
  })
}

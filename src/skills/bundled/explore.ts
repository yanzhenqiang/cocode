import { BASH_TOOL_NAME } from '../../tools/BashTool/toolName.js'
import { registerBundledSkill } from '../bundledSkills.js'

const EXPLORE_SKILL_PROMPT = `You are an Explore agent launcher. Your job is to spawn a read-only codebase exploration agent in an isolated tmux session and return its findings.

## What Explore Does
The explore agent is a fast, read-only search specialist that:
- Exhaustively searches files, patterns, and architecture
- Uses only read operations (find, grep, ls, cat, Read, Glob, Grep)
- Never creates, edits, or deletes files
- Runs on the haiku model for speed and cost efficiency
- Is isolated in its own tmux session so search output does not clutter your context

## When to Spawn Explore
- Broad codebase searches across many files or directories
- Deep architectural understanding ("how does X work?")
- Finding all call sites, imports, or usages of a symbol
- Complex pattern matching across the whole repo

For simple 1-2 file lookups, use Read/Grep directly instead.

## Launch Procedure

1. **Generate a unique session name**:
   \`\`\`bash
   SESSION="explore-$(date +%s)-$(openssl rand -hex 4)"
   \`\`\`

2. **Write the explore prompt file**:
   \`\`\`bash
   mkdir -p /tmp/cocode-explore
   cat > "/tmp/cocode-explore/\${SESSION}.txt" << 'EOF'
   You are a file search specialist for Cocode. This is a READ-ONLY exploration task.

   Rules:
   - Use Bash(find, grep, ls, cat, head, tail), Glob, Grep, and Read only
   - NEVER edit, create, move, copy, or delete files
   - NEVER run git add, git commit, npm install, or any mutating command
   - Make parallel tool calls whenever possible
   - Report findings with specific file paths and line references
   - Be concise — summarize patterns rather than dumping full file contents

   User request: <USER_REQUEST>
   EOF
   \`\`\`

3. **Launch the explore agent** in a tmux session:
   \`\`\`bash
   tmux new-session -d -s "$SESSION" \
     -e "EXPLORE_SESSION=1" \
     -e "PARENT_SESSION=$(tmux display-message -p '#{session_name}' 2>/dev/null || echo 'none')" \
     "cd $(pwd) && cocode --print --model haiku --disallowed-tools 'FileEdit,FileWrite,EnterPlanMode,ExitPlanMode,Agent,Skill' --prompt-file /tmp/cocode-explore/\${SESSION}.txt"
   \`\`\`

4. **Poll for completion**:
   - Wait 10-15 seconds
   - Check: \`tmux has-session -t "$SESSION" 2>/dev/null && echo "running"\`
   - If running, wait another 10-15 seconds and recheck
   - The session auto-terminates when --print mode finishes
   - If stuck longer than 2 minutes, kill it: \`tmux kill-session -t "$SESSION"\`

5. **Capture and report**:
   After the session ends, read the full output:
   \`\`\`bash
   tmux capture-pane -t "$SESSION" -p -S -
   \`\`\`

   Summarize the findings for the user. Include:
   - Key files and their relevance
   - Important patterns, architecture, or conventions discovered
   - Any code snippets worth highlighting (keep them short)
`

export function registerExploreSkill(): void {
  registerBundledSkill({
    name: 'explore',
    description:
      'Launch a read-only exploration agent in an isolated tmux session to deeply search the codebase',
    aliases: ['search'],
    userInvocable: true,
    allowedTools: [BASH_TOOL_NAME],
    getPromptForCommand: async (args) => {
      const userRequest = args.trim() || 'Explore the codebase and report key findings'
      const prompt = EXPLORE_SKILL_PROMPT.replace('<USER_REQUEST>', userRequest)
      return [{ type: 'text', text: prompt }]
    },
  })
}

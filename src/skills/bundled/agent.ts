import { BASH_TOOL_NAME } from '../../tools/BashTool/toolName.js'
import { registerBundledSkill } from '../bundledSkills.js'

const AGENT_SKILL_PROMPT = `You are an agent orchestrator. Your job is to spawn and manage subagents running in independent tmux sessions.

## When to spawn a subagent

Spawn a subagent when:
- The task is self-contained and can run in parallel
- The task would clutter the main context window with raw output
- The task requires a different working directory or isolation

## How to spawn a subagent

1. **Generate a unique session name**:
   \`\`\`bash
   SESSION_NAME="agent-$(uuidgen | tr -d '-')"
   \`\`\`

2. **Write the prompt to a temp file** (avoids shell escaping issues):
   \`\`\`bash
   TMP="\${TMPDIR:-/tmp}"
   PROMPT_FILE="$TMP/cocode/prompts/\${SESSION_NAME}.txt"
   mkdir -p "$(dirname "$PROMPT_FILE")"
   cat > "$PROMPT_FILE" << 'EOF'
   <your prompt here>
   EOF
   \`\`\`

3. **Create the tmux session** with the cocode process:
   \`\`\`bash
   PARENT=$(tmux display-message -p '#S')
   tmux new-session -d -s "$SESSION_NAME" \
     -e "PARENT_SESSION=$PARENT" \
     -e "AGENT_TYPE=Explore" \
     -e "AGENT_ID=$SESSION_NAME" \
     bash -lc "cocode --prompt-file \"$PROMPT_FILE\""
   \`\`\`

4. **Verify the session was created**:
   \`\`\`bash
   tmux has-session -t "$SESSION_NAME" && echo "Spawned: $SESSION_NAME"
   \`\`\`

## How to communicate with a running subagent

- **Send a message**: ${BASH_TOOL_NAME} \`tmux send-keys -t <session-name> "<message>" Enter\`
- **Check status**: ${BASH_TOOL_NAME} \`tmux capture-pane -t <session-name> -p | tail -20\`
- **Kill the session**: ${BASH_TOOL_NAME} \`tmux kill-session -t <session-name>\`
- **List all agent sessions**: ${BASH_TOOL_NAME} \`tmux list-sessions -F '#{session_name}' | grep '^agent-'\`

## Subagent behavior

Subagents are independent cocode processes. They:
- Run in their own tmux session with a full-screen pane
- Can use all tools (Bash, Read, Edit, etc.)
- Can communicate back to the parent via \`tmux send-keys -t "$PARENT_SESSION"\`
- Automatically exit when their task is complete (the tmux session disappears)

## Reporting

After spawning, briefly tell the user what you launched. Include the session name so they can attach manually with \`tmux attach -t <session-name>\` if needed.
`

export function registerAgentSkill(): void {
  registerBundledSkill({
    name: 'agent',
    description: 'Spawn and manage subagents in independent tmux sessions',
    aliases: ['spawn'],
    userInvocable: true,
    allowedTools: [BASH_TOOL_NAME, 'Glob', 'Grep', 'Read', 'FileEdit'],
    getPromptForCommand: async (args) => {
      return [
        { type: 'text', text: AGENT_SKILL_PROMPT },
        { type: 'text', text: `\\n## User Request\\n\\n${args}` },
      ]
    },
  })
}

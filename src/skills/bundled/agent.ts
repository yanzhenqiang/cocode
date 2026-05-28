import { BASH_TOOL_NAME } from '../../tools/BashTool/toolName.js'
import { registerBundledSkill } from '../bundledSkills.js'

const AGENT_SKILL_PROMPT = `Spawn a subagent in an independent tmux session with its own workspace.

Each agent gets a dedicated directory at \`$(pwd)/.cocode/agents/<session-name>/\` containing its prompt and working files.

## How to spawn an agent

Run the \`spawn-agent\` command:

\`\`\`bash
SESSION_NAME="agent-$(uuidgen | tr -d '-')"
spawn-agent "$SESSION_NAME" "<task description>"
\`\`\`
TODO: Support fork-mode subagents that inherit the parent's full conversation
context (history, file state, etc.). When fork mode is available, use
\`cocode --continue <parent-session-id>\` instead of a fresh cocode process.

The \`spawn-agent\` script will:
1. Create \`$(pwd)/.cocode/agents/$SESSION_NAME/\`
2. Write the task description to \`prompt.txt\`
3. Launch a tmux session running cocode
4. Send the prompt to the agent via tmux
5. Set \`PARENT_SESSION\` and \`AGENT_ID\` environment variables

## How to communicate with a running subagent

- **Send a message**: ${BASH_TOOL_NAME} \`tmux send-keys -t <session-name> "<message>" Enter\`
- **Check status**: ${BASH_TOOL_NAME} \`tmux capture-pane -t <session-name> -p | tail -20\`
- **Kill the session**: ${BASH_TOOL_NAME} \`tmux kill-session -t <session-name>\`
- **List all agent sessions**: ${BASH_TOOL_NAME} \`tmux list-sessions -F '#{session_name}' | grep '^agent-'\`

## Subagent behavior

Subagents are independent cocode processes. They:
- Run in their own tmux session with a full-screen pane
- Work inside \`$(pwd)/.cocode/agents/<session-name>/\`
- Inherit the parent's environment (API keys, etc.)
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
        { type: 'text', text: `\n## User Request\n\n${args}` },
      ]
    },
  })
}

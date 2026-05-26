# Cocode

Cocode is an open-source coding-agent CLI for cloud and local model providers.

Use OpenAI-compatible APIs, Gemini, GitHub Models, Codex, Ollama, and other supported backends with one terminal-first workflow: prompts, tools, agents, MCP, slash commands, and streaming output.

## Install

```bash
npm install -g @gitlawb/cocode
```

## Start

```bash
cocode
```

Inside Cocode:

- run `/provider` for guided provider setup and saved profiles
- run `/onboard-github` for GitHub Models onboarding

## Quick Setup

### OpenAI

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_MODEL=gpt-4o

cocode
```

### Ollama

```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=qwen2.5-coder:7b

cocode
```

## Development

```bash
bun install
bun run build
node dist/cli.mjs
```

Run tests:

```bash
bun test
```

## License

See [LICENSE](LICENSE).

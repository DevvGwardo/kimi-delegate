# kimi-mcp

An MCP (Model Context Protocol) server that lets Claude Code delegate tasks to [kimi-cli](https://moonshotai.github.io/kimi-cli/) — Moonshot AI's coding agent.

Claude plans the work, breaks it into sub-tasks, and delegates implementation to Kimi. Kimi executes autonomously and returns results back to Claude for review and integration.

## Tools

| Tool | Description |
|------|-------------|
| `kimi_delegate` | Delegate a coding task (write code, fix bugs, refactor, create files) |
| `kimi_research` | Ask Kimi to investigate/explore a codebase (read-only) |

## Prerequisites

- [kimi-cli](https://moonshotai.github.io/kimi-cli/) installed and authenticated (`kimi login`)
- Node.js >= 18
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

## Setup

### Option A: npx (recommended)

Add to `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "kimi": {
      "command": "npx",
      "args": ["-y", "kimi-code-mcp@latest"]
    }
  }
}
```

Restart Claude Code. Done — no cloning or local install needed.

### Option B: Manual (from source)

```bash
git clone https://github.com/DevvGwardo/kimi-delegate.git
cd kimi-delegate
npm install
```

Add to `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "kimi": {
      "command": "node",
      "args": ["/absolute/path/to/kimi-delegate/server.mjs"]
    }
  }
}
```

Restart Claude Code. The `kimi_delegate` and `kimi_research` tools will now be available.

## How it works

```
You ──► Claude Code ──► kimi_delegate (MCP) ──► kimi-cli --quiet -p "task..."
                   ◄── result ◄──────────────── kimi output
```

1. You ask Claude Code to build something
2. Claude breaks the work into sub-tasks
3. Claude calls `kimi_delegate` for each sub-task
4. kimi-cli runs in non-interactive mode (`--quiet`), auto-approving actions
5. Kimi's output returns to Claude, who reviews and integrates the results

## Usage examples

Once configured, just ask Claude Code to do work — it will automatically delegate to Kimi when appropriate. You can also be explicit:

- *"Use kimi to write the auth middleware"*
- *"Delegate the database migration to kimi"*
- *"Have kimi research how routing works in this project"*

## Tool parameters

### kimi_delegate

| Parameter | Required | Description |
|-----------|----------|-------------|
| `task` | Yes | Detailed description of the implementation task |
| `work_dir` | No | Working directory (defaults to current directory) |

### kimi_research

| Parameter | Required | Description |
|-----------|----------|-------------|
| `question` | Yes | The research/exploration question |
| `work_dir` | No | Working directory to explore |

## License

MIT

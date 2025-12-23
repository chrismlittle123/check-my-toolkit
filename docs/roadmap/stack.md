# STACK Domain Roadmap

Developer environment, infrastructure, and tooling validation.

## Overview

The STACK domain validates local development environment setup including installed tools, running services, environment variables, and editor configuration. It can also install missing tools and expose functionality via MCP server.

```toml
[stack]
├── [stack.tools]       # CLI tools: name, version, installer (mise/brew/system)
├── [stack.services]    # Docker containers, databases, ports
├── [stack.env]         # Required environment variables
├── [stack.editor]      # IDE configs: .vscode/settings.json, .idea/
└── [stack.ai]          # AI configs: CLAUDE.md, .cursorrules, .claude/settings.json
```

**Note:** STACK domain development starts after PROCESS domain is stable.

---

## v2.0 — Tool Version Checking

### Tool Versions: `[stack.tools]`

| Check | Description | Data Source |
|-------|-------------|-------------|
| Node.js version | Installed version matches required | Local system |

```toml
[stack.tools]
node = "20"
```

**Version Matching:**
- `"20"` - Major version match (20.x.x)
- `"20.10"` - Major.minor match (20.10.x)
- `"20.10.0"` - Exact match

**Behavior:**
- Tool not installed = violation
- Version mismatch = violation
- Report installed vs required version

### Output Format

```
[stack.tools]
  ✓ node: 20.11.0 (required: 20)
  ✗ npm: not installed (required: 10)

stack: 1 violation found
```

---

## v2.1 — More Tools

| Check | Description | Data Source |
|-------|-------------|-------------|
| npm/pnpm/yarn | Package manager version | Local system |
| Docker | Docker version + running | Local system |
| Git | Git version | Local system |

```toml
[stack.tools]
node = "20"
npm = "10"
docker = "24"
git = "2.40"
```

---

## v2.2 — Fix Command

`cm stack fix` installs missing tools via mise/brew:

```bash
cm stack diff   # Preview what would be installed
cm stack fix    # Install missing tools
```

```toml
[stack.tools]
installer = "mise"  # or "brew", "manual"
node = "20"
npm = "10"
eslint = true       # Just check installed, no version
ruff = true
gitleaks = true
semgrep = true
```

---

## v2.3 — Services Check

| Check | Description | Data Source |
|-------|-------------|-------------|
| Docker containers | Required containers running | Docker API |
| Ports | Required ports available | Local system |
| Databases | Connection check | Connection test |

```toml
[stack.services]
docker_compose = true
required_containers = ["postgres", "redis"]
required_ports = [3000, 5432, 6379]
```

---

## v2.4 — Editor Settings

| Check | Description | Data Source |
|-------|-------------|-------------|
| VS Code settings | .vscode/settings.json exists and valid | Local filesystem |
| VS Code extensions | Required extensions in recommendations | Local filesystem |

```toml
[stack.editor]
vscode_settings = true
vscode_extensions = ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode"]
```

---

## v2.5 — AI Settings

| Command | Description |
|---------|-------------|
| `cm stack fix claude` | Generate .claude/settings.json from remote |
| `cm stack fix cursor` | Generate .cursorrules from remote |

```toml
[stack.ai]
claude_settings = "github:org/standards/claude@v1.0.0"
cursorrules = "github:org/standards/cursor@v1.0.0"
```

---

## v2.6 — Environment Variables

| Check | Description | Data Source |
|-------|-------------|-------------|
| Required env vars | Variables exist | Environment |
| .env file | File exists with required keys | Local filesystem |

```toml
[stack.env]
required = ["DATABASE_URL", "API_KEY"]
env_file = ".env"
```

---

## v2.7 — MCP Server

MCP (Model Context Protocol) server for AI agent integration. Exposes check-my-toolkit functionality to Claude Code, Cursor, and other MCP-compatible tools.

| Tool | Description |
|------|-------------|
| `check_files` | Lint specific files for violations |
| `check_project` | Lint entire project or subdirectory |
| `fix_files` | Auto-fix violations via ESLint --fix and Ruff --fix |
| `get_guidelines` | Fetch coding standards/templates from check.toml |
| `get_status` | Get current session state and project info |
| `suggest_config` | Generate check.toml from project description |
| `validate_config` | Validate TOML content against check.toml schema |

```bash
cm stack mcp-server   # Start MCP server (stdio transport)
```

```json
// Claude Code MCP config (~/.claude/settings.json)
{
  "mcpServers": {
    "cm": {
      "command": "cm",
      "args": ["stack", "mcp-server"]
    }
  }
}
```

---

## Future

| Check | Description | Tool/API |
|-------|-------------|----------|
| IaC compliance | CDK/Terraform best practices | checkov, tflint, cdk-nag |
| Container security | Image scanning | Trivy |
| System map | Registry of services | Custom |
| Dependency graphs | Cross-service deps | Custom |
| Database schemas | Migration hygiene | Custom |
| Observability | Required metrics/logs | Custom |
| Cost tagging | Required tags | Cloud APIs |

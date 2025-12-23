# check-my-toolkit Roadmap

Unified CLI for code quality, process enforcement, and stack validation.

```bash
cm check          # Run all checks (code, process, stack)
cm audit          # Verify configs exist and match check.toml
cm code check     # Run linters, type checkers
cm code audit     # Verify code configs exist
cm process check  # Validate PR, branches, tickets
cm stack check    # Validate tools, services, env
```

---

## Development Order

The three domains are developed sequentially:

| Phase | Domain | Focus |
|-------|--------|-------|
| **Phase 1** | [CODE](roadmap/code.md) | Static analysis, linting, type checking, security |
| **Phase 2** | [PROCESS](roadmap/process.md) | PR validation, GitHub settings, CI/CD |
| **Phase 3** | [STACK](roadmap/stack.md) | Local tools, services, dev environment, MCP |

---

## Domain Overview

| Domain | Purpose |
|--------|---------|
| `code` | Static analysis, linting, type checking, configs exist, code structure |
| `process` | PR validation, GitHub settings, CI/CD configured, Linear workflow |
| `stack` | Local tools installed, services running, dev environment |

**Note:** Some features span multiple domains:
- **Tool enforcement**: Code checks configs exist, Stack checks tools installed, Process checks CI runs
- **Files**: All committed files (configs, docs, .nvmrc) are in `code.files`. Stack only checks runtime state.

---

## Config Structure

The three domains map to `check.toml` sections:

```toml
├── [extends]                   # Remote config inheritance (stricter-only)
│
├── [code]                      # Static analysis, security & code quality
│   ├── [code.linting]          # ESLint, Ruff
│   ├── [code.formatting]       # Prettier, Black
│   ├── [code.types]            # tsc, ty
│   ├── [code.unused]           # Knip, Vulture
│   ├── [code.complexity]       # File/function size, nesting, cyclomatic
│   ├── [code.tests]            # Test files exist, naming patterns
│   ├── [code.security]         # Secrets, SAST, dependency audits
│   └── [code.files]            # Required files & configs
│
├── [process]                   # Workflow & policy enforcement
│   ├── [process.pr]            # Size limits, title format, approvals
│   ├── [process.commits]       # Conventional commits, sign-off
│   ├── [process.branches]      # Naming patterns
│   ├── [process.tickets]       # Linear/Jira references required
│   ├── [process.ci]            # Required workflows, coverage enforcement
│   └── [process.repo]          # Branch protection, CODEOWNERS, labels
│
└── [stack]                     # Developer environment & infrastructure
    ├── [stack.tools]           # CLI tools: name, version, installer (mise/brew/system)
    ├── [stack.services]        # Docker containers, databases, ports
    ├── [stack.env]             # Required environment variables
    ├── [stack.editor]          # IDE configs: .vscode/settings.json, .idea/
    └── [stack.ai]              # AI configs: CLAUDE.md, .cursorrules, .claude/settings.json
```

---

## Version Summary

### CODE Domain (v0.x)

| Version | Features |
|---------|----------|
| v0.1 | ESLint, Ruff, tsc, audit command |
| v0.2 | Prettier, Black, tests, unused code, complexity |
| v0.3 | Python types (ty), security scanning, required files |
| v0.4 | Config inheritance, generate commands |
| v0.5 | Validation, registry |
| v0.6 | Documentation files |

→ [Full CODE roadmap](roadmap/code.md)

### PROCESS Domain (v1.x)

| Version | Features |
|---------|----------|
| v1.0 | PR checks, branch naming, ticket references |
| v1.1 | Repo settings (branch protection, CODEOWNERS) |
| v1.2 | Conventional commits, CI checks |
| v1.3 | Sync to GitHub |
| v1.4 | Linear/Jira integration |

→ [Full PROCESS roadmap](roadmap/process.md)

### STACK Domain (v2.x)

| Version | Features |
|---------|----------|
| v2.0 | Tool version checking (node) |
| v2.1 | More tools (npm, docker, git) |
| v2.2 | Fix command (mise/brew install) |
| v2.3 | Services check (docker, ports) |
| v2.4 | Editor settings |
| v2.5 | AI settings |
| v2.6 | Environment variables |
| v2.7 | MCP server |

→ [Full STACK roadmap](roadmap/stack.md)

---

## Tech Stack

| Component | Choice |
|-----------|--------|
| Language | TypeScript |
| CLI | Commander.js |
| Config | check.toml via @iarna/toml + Zod |
| Schema validation | JSON Schema |
| Linting | ESLint, Ruff |
| GitHub API | @octokit/rest |
| Linear API | @linear/sdk |
| Version detection | node --version, docker --version, etc. |
| Tool installation | mise, brew |
| Output | chalk (text), JSON |
| MCP | Model Context Protocol server |

---

## CLI Flags

| Flag | Description |
|------|-------------|
| `--json` | JSON output format |
| `--quiet` | Minimal output (exit code only) |
| `--ci` | CI mode (exit 1 on failure) |
| `--force` | Overwrite existing files |
| `--stdout` | Output to stdout instead of file |
| `--skip-requirements` | Skip requirements validation |
| `--skip-limits` | Skip code limits validation |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Check failures found |
| 2 | Configuration error |
| 3 | Tool/runtime error |

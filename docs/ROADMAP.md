# check-my-toolkit Roadmap

Unified CLI for code quality, process enforcement, and stack validation.

```bash
cm code check     # Static analysis & conventions
cm process check  # Workflow & policy enforcement
cm stack check    # Environment & infrastructure
```

---

## Domain Hierarchy

The three domains and their subdomains map directly to `check.toml` sections:

check.toml
```
├── [extends]                   # Remote config inheritance (stricter-only)
│
├── [code]                      # Static analysis, security & code quality
│   ├── [code.linting]          # ESLint, Ruff
│   ├── [code.formatting]       # Prettier, Black
│   ├── [code.types]            # tsc, ty
│   ├── [code.unused]           # Knip, Vulture
│   ├── [code.complexity]       # File/function size, nesting, cyclomatic
│   ├── [code.tests]            # Coverage thresholds, test patterns
│   ├── [code.security]         # Secrets, SAST, dependency audits
│   └── [code.files]            # Required files & configs
│
├── [process]                   # Workflow & policy enforcement
│   ├── [process.pr]            # Size limits, title format, approvals
│   ├── [process.commits]       # Conventional commits, sign-off
│   ├── [process.branches]      # Naming patterns
│   ├── [process.tickets]       # Linear/Jira references required
│   ├── [process.ci]            # Required workflows exist
│   └── [process.repo]          # Branch protection, CODEOWNERS, labels
│
└── [stack]                     # Developer environment & infrastructure
    ├── [stack.tools]           # CLI tools: name, version, installer (mise/brew/system)
    ├── [stack.services]        # Docker containers, databases, ports
    ├── [stack.env]             # Required environment variables
    └── [stack.ai]              # AI tool settings (Claude, Cursor, etc.)
```
---

## Domain Overview

| Domain | Purpose |
|--------|---------|
| `code` | Static analysis, linting, type checking, configs exist, code structure |
| `process` | PR validation, GitHub settings, CI/CD configured, Linear workflow |
| `stack` | Local tools installed, services running, dev environment |

**Note:** Some features span multiple domains:
- **Tool enforcement**: Code checks configs exist, Stack checks tools installed, Process checks CI/CD runs
- **Required files**: Code-related files (CLAUDE.md) vs Stack-related files (.nvmrc)

---

## v0.1 — MVP

### Code: Linting

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| ESLint | JavaScript/TypeScript linting | ESLint |
| Ruff | Python linting | Ruff |

```toml
[code.linting]
eslint = true
ruff = true
```

### Code: Type Checking

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| TypeScript | Type checking | tsc |

```toml
[code.types]
tsc = true
```

### Process

| Check | Description | Data Source |
|-------|-------------|-------------|
| PR size (files) | Max files changed in PR | GitHub API |
| PR size (lines) | Max lines changed | GitHub API |
| Branch naming | Branch name matches pattern | GitHub API |
| Ticket reference | Linear ticket in title/body/branch | GitHub API |
| Approvals | Minimum approvals received | GitHub API |

```toml
[process.pr]
max_files = 20
max_lines = 400
min_approvals = 1

[process.branches]
pattern = "^(feature|fix|hotfix)/[A-Z]+-[0-9]+-[a-z0-9-]+$"

[process.tickets]
pattern = "[A-Z]+-[0-9]+"
check_in = ["title", "branch", "body"]
```

### Stack: Tools

| Check | Description | Data Source |
|-------|-------------|-------------|
| Node version | Installed version matches required | Local system |

```toml
[stack.tools]
node = "20"
```

---

## v0.2

### Code: Unused Code Detection

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Unused exports (TS) | Dead exports, files, dependencies | Knip |
| Unused code (Python) | Dead code detection | Vulture |

```toml
[code.unused]
knip = true
vulture = true
```

### Code: Complexity

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Max file lines | Maximum lines per file | Native AST |
| Max function lines | Maximum lines per function | Native AST |
| Max parameters | Maximum function parameters | Native AST |
| Max nesting depth | Maximum nesting depth | Native AST |

```toml
[code.complexity]
max_file_lines = 500
max_function_lines = 50
max_parameters = 5
max_nesting_depth = 4
```

### Process: Repo Settings

| Check | Description | Data Source |
|-------|-------------|-------------|
| Branch protection | Required reviews, status checks | GitHub API |
| CODEOWNERS | File exists and valid | Local + GitHub |
| Labels | Required labels exist | GitHub API |

```toml
[process.repo]
require_branch_protection = true
require_codeowners = true
required_labels = ["bug", "feature", "breaking"]
```

### Stack: More Tools

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

## v0.3

### Code: Type Checking (Python)

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| ty | Python type checking | ty (Astral) |

```toml
[code.types]
tsc = true
ty = true
```

### Code: Security Scanning

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Secrets | Hardcoded secrets detection | Gitleaks |
| SAST | Static security analysis | Semgrep |
| Dependency audit (TS) | Vulnerability scanning | npm-audit |
| Dependency audit (Python) | Vulnerability scanning | pip-audit |

```toml
[code.security]
secrets = true
sast = true
npm_audit = true
pip_audit = true
```

### Code: Required Files

| Check | Description | Data Source |
|-------|-------------|-------------|
| Repo files | README.md, LICENSE, SECURITY.md | Local filesystem |
| Tooling configs | eslint.config.js, ruff.toml, tsconfig.json | Local filesystem |
| Docs | CLAUDE.md, ADRs | Local filesystem |

```toml
[code.files]
repo = ["README.md", "LICENSE", "SECURITY.md"]
tooling = ["eslint.config.js", "ruff.toml", "tsconfig.json"]
docs = ["CLAUDE.md"]
```

### Process: Sync to GitHub

`cm process sync` pushes config to GitHub API:

- Update branch protection rules
- Set merge strategy
- Configure required status checks

```bash
cm process diff   # Preview changes
cm process sync   # Apply changes
```

### Process: CI/CD Checks

| Check | Description | Data Source |
|-------|-------------|-------------|
| GitHub Actions exist | Required workflows in .github/workflows | Local filesystem |
| Actions configured | Required checks run on PRs | GitHub API |

```toml
[process.ci]
required_workflows = ["lint.yml", "test.yml"]
require_status_checks = true
```

### Stack: Fix Command

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

## v0.4

### Code: Remote Config Inheritance

| Feature | Description |
|---------|-------------|
| Extends support | `[extends]` section in check.toml |
| Remote fetching | `github:owner/repo/path@version` format |
| Version pinning | `@v1.0.0`, `@latest` via manifest |
| SSH auth | Uses ambient git credentials for private repos |
| Additive-only | Block local rules from conflicting with inherited |

```toml
[extends]
rulesets = "github:org/standards/rulesets@v1.0.0"
```

### Code: Generate & Audit Commands

| Command | Description |
|---------|-------------|
| `cm code generate eslint` | Generate eslint.config.js from check.toml |
| `cm code generate ruff` | Generate ruff.toml from check.toml |
| `cm code generate tsc` | Generate tsconfig.json from check.toml |
| `cm code audit` | Verify linter configs match check.toml |
| `cm code context` | Output rules for AI agents |

### Process: Tickets (Linear/Jira)

| Check | Description | Data Source |
|-------|-------------|-------------|
| Ticket state | Required states, labels | Linear/Jira API |
| Estimates | Required estimates | Linear/Jira API |
| Assignees | Required assignees | Linear/Jira API |

```toml
[process.tickets]
provider = "linear"  # or "jira"
require_estimate = true
require_assignee = true
allowed_states = ["In Progress", "In Review"]
```

### Stack: Services Check

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

### Stack: AI Settings Fix

| Command | Description |
|---------|-------------|
| `cm stack fix claude` | Generate .claude/settings.json from remote |

```toml
[stack.ai.claude]
extends = "github:org/standards/claude@v1.0.0"
```

---

## v0.5

### Code: MCP Server

| Tool | Description |
|------|-------------|
| `check_files` | Lint specific files |
| `check_project` | Lint entire project |
| `fix_files` | Auto-fix violations |
| `get_guidelines` | Fetch coding standards |
| `get_status` | Get session state |
| `suggest_config` | Generate check.toml from description |
| `validate_config` | Validate check.toml against schema |

```bash
cm code mcp-server
```

### Code: Validation & Registry

| Command | Description |
|---------|-------------|
| `cm code validate` | Validate check.toml against JSON schema |
| `cm code registry list` | List prompts/rulesets with filtering |
| `cm code registry check` | Verify if entry exists |
| `cm code registry sync` | Detect sync issues |
| `cm code registry bump` | Create new versions |

### Stack: Environment Variables

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

## v0.6

### Code: Documentation Files

| Check | Description | Data Source |
|-------|-------------|-------------|
| ADRs | Required ADRs exist, follow template | Local filesystem |
| RFCs | Required for major changes | Local filesystem |
| Service READMEs | Required sections present | Local filesystem |
| Runbooks | Required for production services | Local filesystem |

```toml
[code.files]
docs = ["CLAUDE.md"]
adr_directory = "docs/adr"
adr_template = "docs/adr/template.md"
require_service_readme = true
readme_required_sections = ["Overview", "Setup", "API", "Deployment"]
```

---

## Future

### Code

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Naming conventions | Files, directories | ls-lint |
| Complexity | Cyclomatic/cognitive | ESLint plugins |
| Commit messages | Conventional commits | commitlint |
| License headers | Required headers | addlicense |
| API contracts | OpenAPI/GraphQL | Spectral |
| Dependency health | Outdated, deprecated | npm-check |
| Import ordering | Consistent structure | ESLint plugins |
| TODO/FIXME tracking | Stale todos | custom |
| Test coverage | Minimum thresholds | nyc |
| Bundle size | Max artifact size | size-limit |

### Process

| Check | Description | Tool/API |
|-------|-------------|----------|
| PR templates | Required template usage | GitHub API |
| Review SLAs | Max time to review | GitHub API |
| Changelog | Enforced updates | changesets |
| Release process | Tag format, versioning | semantic-release |
| CI/CD checks | Required workflows | GitHub API |
| Deployment gates | Environment protection | GitHub API |
| Stale issues | Auto-close stale | actions/stale |

### Stack

| Check | Description | Tool/API |
|-------|-------------|----------|
| IaC compliance | CDK/Terraform best practices | checkov, tflint, cdk-nag |
| Container security | Image scanning | Trivy |
| System map | Registry of services | Custom |
| Dependency graphs | Cross-service deps | Custom |
| Database schemas | Migration hygiene | Custom |
| Observability | Required metrics/logs | Custom |
| Cost tagging | Required tags | Cloud APIs |

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

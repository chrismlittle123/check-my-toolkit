# check-my-toolkit Roadmap

Unified CLI for code quality, process enforcement, and stack validation.

```bash
cm code check     # Static analysis & conventions
cm process check  # Workflow & policy enforcement
cm stack check    # Environment & infrastructure
```

---

## Domains

| Domain | Purpose |
|--------|---------|
| `code` | Static analysis, linting, security scanning |
| `process` | PR validation, GitHub settings, Linear workflow |
| `stack` | Local tools, services, architecture docs |

---

## v0.1 — MVP

### Code

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Linting | ESLint with project config | ESLint |

```toml
[code.linting]
enabled = true
eslint = true
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

[process.branch]
pattern = "^(feature|fix|hotfix)/[A-Z]+-[0-9]+-[a-z0-9-]+$"

[process.ticket]
pattern = "[A-Z]+-[0-9]+"
check_in = ["title", "branch", "body"]
```

### Stack

| Check | Description | Data Source |
|-------|-------------|-------------|
| Node version | Installed version matches required | Local system |

```toml
[stack.node]
version = "20"
```

---

## v0.2

### Code: Unused Code Detection

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Unused exports | Dead exports, files, dependencies | Knip |

```toml
[code.unused]
enabled = true
```

### Process: GitHub Repo Settings

| Check | Description | Data Source |
|-------|-------------|-------------|
| Branch protection | Required reviews, status checks | GitHub API |
| CODEOWNERS | File exists and valid | Local + GitHub |
| Required files | README, LICENSE, etc. | Local filesystem |

```toml
[process.github]
require_branch_protection = true
require_codeowners = true

[process.files]
required = ["README.md", "LICENSE", "CONTRIBUTING.md"]
```

### Stack: Tool Version Checks

| Check | Description | Data Source |
|-------|-------------|-------------|
| npm/pnpm/yarn | Package manager version | Local system |
| Docker | Docker version + running | Local system |
| Git | Git version | Local system |

```toml
[stack.npm]
version = "10"

[stack.docker]
required = true
version = "24"

[stack.git]
version = "2.40"
```

---

## v0.3

### Code: Security Scanning

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Secrets | Hardcoded secrets detection | Gitleaks |
| SAST | Static security analysis | Semgrep |

```toml
[code.security]
enabled = true
secrets = true
sast = true
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

### Stack: Fix Command

`cm stack fix` installs missing tools via mise/brew:

```bash
cm stack diff   # Preview what would be installed
cm stack fix    # Install missing tools
```

```toml
[stack.tools]
installer = "mise"  # or "brew", "manual"
```

---

## v0.4

### Code: MegaLinter Integration

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Multi-language linting | All languages, formatting | MegaLinter |
| Spelling | Code comments, strings | cspell |
| Duplication | Copy-paste detection | jscpd |

```toml
[code.megalinter]
enabled = true
languages = ["typescript", "javascript", "json", "yaml", "markdown"]
```

### Process: Linear Integration

| Check | Description | Data Source |
|-------|-------------|-------------|
| Ticket state | Required states, labels | Linear API |
| Estimates | Required estimates | Linear API |
| Assignees | Required assignees | Linear API |

```toml
[process.linear]
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

[stack.ports]
required = [3000, 5432, 6379]
```

---

## v0.5

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

### Stack: Architecture Documentation

| Check | Description | Data Source |
|-------|-------------|-------------|
| ADRs | Required ADRs exist, follow template | Local filesystem |
| RFCs | Required for major changes | Local filesystem |
| Service READMEs | Required sections present | Local filesystem |
| Runbooks | Required for production services | Local filesystem |

```toml
[stack.docs]
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
| GitHub API | @octokit/rest |
| Linear API | @linear/sdk |
| Version detection | node --version, docker --version, etc. |
| Tool installation | mise, brew |
| Output | chalk (text), JSON |

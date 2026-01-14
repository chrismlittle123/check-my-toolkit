# check-my-toolkit

A unified CLI for enforcing code quality, workflow compliance, and infrastructure standards. One config file, multiple tools, consistent output.

```bash
npm install -g check-my-toolkit
```

## Why?

Most projects cobble together ESLint, Prettier, Ruff, tsc, and various other tools with inconsistent configs. `cm` unifies them:

- **Single config** — `check.toml` controls all tools
- **Three domains** — Code quality, process compliance, infrastructure validation
- **Consistent output** — Same format whether it's ESLint, Ruff, or AWS tagging
- **Org standards** — Extend from a shared registry to enforce team conventions
- **CI-ready** — Exit codes and JSON output for automation

## Quick Start

```bash
# Create check.toml
cat > check.toml << 'EOF'
[code.linting.eslint]
enabled = true

[code.types.tsc]
enabled = true

[process.hooks]
enabled = true
require_husky = true
EOF

# Run all checks
cm check
```

## Domains

### CODE — 14 Tools

Static analysis, formatting, type checking, and security.

| Category | Tools |
|----------|-------|
| Linting | ESLint, Ruff |
| Formatting | Prettier, Ruff Format |
| Type Checking | tsc, ty |
| Unused Code | Knip, Vulture |
| Security | Gitleaks, npm-audit, pip-audit |
| Other | Tests, Naming, Disable Comments |

### PROCESS — 8 Checks

Workflow and policy enforcement.

| Check | Purpose |
|-------|---------|
| Hooks | Git hooks (Husky) validation |
| CI | GitHub workflow requirements |
| Branches | Branch naming patterns |
| PR | Size limits (files, lines) |
| Tickets | Jira/Linear references |
| Coverage | Threshold enforcement |
| Repo | Branch protection, CODEOWNERS |
| Backups | S3 backup verification |

### INFRA — 1 Check

Infrastructure validation.

| Check | Purpose |
|-------|---------|
| Tagging | AWS resource tag requirements |

## Commands

```bash
# Run all checks
cm check                       # All domains (code + process + infra)
cm audit                       # Verify all configs exist

# Domain-specific
cm code check                  # Code quality checks
cm process check               # Workflow validation
cm infra check                 # Infrastructure checks

# Process utilities
cm process diff                # Show branch protection differences
cm process sync --apply        # Sync branch protection to GitHub

# Project management
cm projects detect             # Discover projects in monorepo
cm projects detect --fix       # Create missing check.toml files

# Configuration
cm validate config             # Validate check.toml
cm schema config               # Output JSON schema
```

## Configuration

### CODE Domain

```toml
[code.linting.eslint]
enabled = true
max-warnings = 0

[code.linting.ruff]
enabled = true
format = true
line-length = 88

[code.types.tsc]
enabled = true

[code.types.tsc.require]
strict = true

[code.formatting.prettier]
enabled = true

[code.unused.knip]
enabled = true

[code.security.secrets]
enabled = true

[code.naming]
enabled = true

[[code.naming.rules]]
extensions = ["ts", "tsx"]
file_case = "kebab-case"
folder_case = "kebab-case"
```

### PROCESS Domain

```toml
[process.hooks]
enabled = true
require_husky = true
require_hooks = ["pre-commit", "pre-push"]

[process.ci]
enabled = true
require_workflows = ["ci.yml"]

[process.ci.jobs]
"ci.yml" = ["test", "lint", "build"]

[process.branches]
enabled = true
pattern = "^(feature|fix|hotfix)/v[0-9]+\\.[0-9]+\\.[0-9]+/.+"
exclude = ["main", "develop"]

[process.pr]
enabled = true
max_files = 20
max_lines = 500

[process.tickets]
enabled = true
pattern = "^(PROJ)-[0-9]+"
require_in_commits = true

[process.coverage]
enabled = true
min_threshold = 80

[process.repo]
enabled = true
require_branch_protection = true
require_codeowners = true

[process.repo.branch_protection]
branch = "main"
required_reviews = 1

[process.backups]
enabled = true
bucket = "my-backups"
prefix = "github/myorg/myrepo"
max_age_hours = 24
```

### INFRA Domain

```toml
[infra.tagging]
enabled = true
region = "us-east-1"
required = ["Environment", "Owner", "CostCenter"]

[infra.tagging.values]
Environment = ["dev", "stag", "prod"]
```

### Extending from a Registry

Share standards across repos:

```toml
[extends]
registry = "github:myorg/standards"
rulesets = ["typescript", "security"]
```

## CI Integration

### GitHub Actions

```yaml
- name: Install check-my-toolkit
  run: npm install -g check-my-toolkit

- name: Run checks
  run: cm check
```

### JSON Output

```bash
cm check --format json
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Violations found |
| 2 | Configuration error |
| 3 | Runtime error |

## Monorepo Usage

Works with npm workspaces, Turborepo, Nx, and pnpm workspaces.

```bash
# Detect and initialize projects
cm projects detect --fix

# Run with task runners
npm run check --workspaces --if-present  # npm
turbo check                               # Turborepo
pnpm -r run check                         # pnpm
```

## Documentation

- [Full Feature Documentation](docs/FEATURES.md) — Detailed configuration for all 23 checks
- [Roadmap](docs/roadmap/) — Domain-specific documentation

## Development

```bash
# Prerequisites (macOS)
brew bundle

# Commands
npm install        # Install dependencies
npm run build      # Compile TypeScript
npm test           # Run tests
npm run lint       # Lint
```

## License

MIT

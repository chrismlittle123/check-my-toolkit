# Features - check-my-toolkit v0.28.0

Unified project health checks for code quality, process compliance, and infrastructure validation.

## Overview

check-my-toolkit (`cm`) provides a single CLI to run multiple code quality, process, and infrastructure tools with unified configuration via `check.toml`. Three domains are fully implemented:

- **CODE** - 14 integrated tools for linting, formatting, type checking, security, and more
- **PROCESS** - 8 workflow checks for git hooks, CI, PRs, branches, and repository settings
- **INFRA** - AWS resource tagging validation

---

## Quick Reference

| Domain | Tools | Config |
|--------|-------|--------|
| CODE | ESLint, Ruff, Prettier, tsc, ty, Knip, Vulture, Gitleaks, npm-audit, pip-audit | `[code.*]` |
| PROCESS | Hooks, CI, Branches, PR, Tickets, Coverage, Repo, Backups | `[process.*]` |
| INFRA | AWS Tagging | `[infra.*]` |

---

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `cm check` | Run all checks (code + process + infra) |
| `cm audit` | Verify all configs exist |
| `cm code check` | Run code quality checks |
| `cm code audit` | Verify code tool configs |
| `cm process check` | Run workflow validation |
| `cm process audit` | Verify workflow configs |
| `cm process diff` | Show branch protection differences |
| `cm process sync --apply` | Sync branch protection to GitHub |
| `cm infra check` | Run infrastructure checks |
| `cm infra audit` | Verify infrastructure configs |

### Utility Commands

| Command | Description |
|---------|-------------|
| `cm validate config` | Validate check.toml syntax and schema |
| `cm validate registry` | Validate registry structure |
| `cm schema config` | Output JSON schema for check.toml |
| `cm projects detect` | Discover projects in monorepo |
| `cm projects detect --fix` | Create missing check.toml files |

### Output Formats

```bash
cm check              # Text output (default)
cm check -f json      # JSON output for CI
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Violations found |
| 2 | Configuration error |
| 3 | Runtime error |

---

# CODE Domain

Static analysis, security, and code quality enforcement.

## Linting

### ESLint (`[code.linting.eslint]`)

JavaScript/TypeScript linting.

```toml
[code.linting.eslint]
enabled = true
files = ["src/**/*.ts"]
ignore = ["**/*.test.ts"]
max-warnings = 0

[code.linting.eslint.rules]
"no-unused-vars" = "error"
"complexity" = { severity = "error", max = 10 }
```

| Property | Value |
|----------|-------|
| Tool | ESLint |
| Languages | JavaScript, TypeScript |
| Config Files | `eslint.config.js`, `.eslintrc.*` |
| Audit | Verifies rules match check.toml requirements |

---

### Ruff (`[code.linting.ruff]`)

Python linting (extremely fast, written in Rust).

```toml
[code.linting.ruff]
enabled = true
format = true  # Also check formatting
line-length = 88

[code.linting.ruff.lint]
select = ["E", "F", "W"]
ignore = ["E501"]
```

| Property | Value |
|----------|-------|
| Tool | Ruff |
| Languages | Python |
| Config Files | `ruff.toml`, `pyproject.toml` |

---

## Formatting

### Prettier (`[code.formatting.prettier]`)

JavaScript/TypeScript/CSS/JSON formatting.

```toml
[code.formatting.prettier]
enabled = true
```

| Property | Value |
|----------|-------|
| Tool | Prettier |
| Languages | JS, TS, JSON, CSS, etc. |
| Config Files | `.prettierrc`, `prettier.config.js` |

---

### Ruff Format

Python formatting (via `format = true` in Ruff config).

```toml
[code.linting.ruff]
enabled = true
format = true
```

---

## Type Checking

### TypeScript (`[code.types.tsc]`)

TypeScript type checking with config auditing.

```toml
[code.types.tsc]
enabled = true

[code.types.tsc.require]
strict = true
noImplicitAny = true
strictNullChecks = true
```

| Property | Value |
|----------|-------|
| Tool | tsc |
| Languages | TypeScript |
| Config Files | `tsconfig.json` |
| Audit | Verifies compiler options match requirements |

**Auditable Options:** `strict`, `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `esModuleInterop`, `skipLibCheck`, `forceConsistentCasingInFileNames`

---

### ty (`[code.types.ty]`)

Python type checking (Astral's fast type checker).

```toml
[code.types.ty]
enabled = true
```

| Property | Value |
|----------|-------|
| Tool | ty |
| Languages | Python |
| Command | `uvx ty check` |

---

## Unused Code Detection

### Knip (`[code.unused.knip]`)

Unused code detection for JavaScript/TypeScript.

```toml
[code.unused.knip]
enabled = true
```

**Detects:** Unused files, dependencies, exports, types, unlisted dependencies, duplicate exports.

---

### Vulture (`[code.unused.vulture]`)

Dead code detection for Python.

```toml
[code.unused.vulture]
enabled = true
```

**Detects:** Unused functions, classes, variables, imports, methods, unreachable code.

---

## Test Validation

### Tests (`[code.tests]`)

Validates test files exist.

```toml
[code.tests]
enabled = true
pattern = "**/*.{test,spec}.{ts,tsx,js,jsx,py}"
min_test_files = 1
```

---

## Security

### Gitleaks (`[code.security.secrets]`)

Hardcoded secrets detection.

```toml
[code.security.secrets]
enabled = true
```

**Detects:** API keys, AWS credentials, database strings, private keys, tokens, passwords.

---

### npm audit (`[code.security.npmaudit]`)

JavaScript dependency vulnerability scanning.

```toml
[code.security.npmaudit]
enabled = true
```

Auto-detects pnpm or npm based on lock file.

---

### pip-audit (`[code.security.pipaudit]`)

Python dependency vulnerability scanning.

```toml
[code.security.pipaudit]
enabled = true
```

---

## Naming Conventions

### Naming (`[code.naming]`)

File and folder naming validation.

```toml
[code.naming]
enabled = true

[[code.naming.rules]]
extensions = ["ts", "tsx"]
file_case = "kebab-case"
folder_case = "kebab-case"
exclude = ["tests/**"]
allow_dynamic_routes = true  # For Next.js [id], [...slug], (group)

[[code.naming.rules]]
extensions = ["py"]
file_case = "snake_case"
folder_case = "snake_case"
```

**Supported Cases:** `kebab-case`, `snake_case`, `camelCase`, `PascalCase`

---

## Code Quality

### Disable Comments (`[code.quality.disable-comments]`)

Detects linter disable comments.

```toml
[code.quality.disable-comments]
enabled = true
extensions = ["ts", "tsx", "js", "jsx", "py"]
exclude = ["tests/**"]
```

**Default Patterns:** `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `# noqa`, `# type: ignore`, `prettier-ignore`

---

# PROCESS Domain

Workflow and policy enforcement.

## Git Hooks (`[process.hooks]`)

Verify Husky git hooks are installed.

```toml
[process.hooks]
enabled = true
require_husky = true
require_hooks = ["pre-commit", "pre-push"]

[process.hooks.commands]
pre-commit = ["lint-staged"]
pre-push = ["npm test"]
```

---

## CI Workflows (`[process.ci]`)

Verify GitHub workflows exist with required jobs/actions.

```toml
[process.ci]
enabled = true
require_workflows = ["ci.yml", "release.yml"]

[process.ci.jobs]
"ci.yml" = ["test", "lint", "build"]

[process.ci.actions]
"ci.yml" = ["actions/checkout", "actions/setup-node"]
```

---

## Branch Naming (`[process.branches]`)

Enforce branch naming conventions.

```toml
[process.branches]
enabled = true
pattern = "^(feature|fix|hotfix|docs)/v[0-9]+\\.[0-9]+\\.[0-9]+/.+"
exclude = ["main", "master", "develop"]
```

---

## PR Size Limits (`[process.pr]`)

Enforce PR size limits.

```toml
[process.pr]
enabled = true
max_files = 20
max_lines = 500
```

---

## Ticket References (`[process.tickets]`)

Require ticket references in commits/branches.

```toml
[process.tickets]
enabled = true
pattern = "^(ABC|XYZ)-[0-9]+"
require_in_commits = true
require_in_branch = false
```

---

## Coverage Enforcement (`[process.coverage]`)

Verify coverage thresholds are configured.

```toml
[process.coverage]
enabled = true
min_threshold = 80
enforce_in = "config"  # or "ci" or "both"
```

---

## Repository Settings (`[process.repo]`)

Verify branch protection and CODEOWNERS.

```toml
[process.repo]
enabled = true
require_branch_protection = true
require_codeowners = true

[process.repo.branch_protection]
branch = "main"
required_reviews = 1
dismiss_stale_reviews = true
require_code_owner_reviews = true
require_status_checks = ["ci"]
require_branches_up_to_date = true
enforce_admins = true
```

### Sync Branch Protection

```bash
cm process diff              # Show what would change
cm process sync --apply      # Apply changes to GitHub
```

---

## S3 Backups (`[process.backups]`)

Verify repository backups exist in S3.

```toml
[process.backups]
enabled = true
bucket = "my-org-backups"
prefix = "github/myorg/myrepo"
max_age_hours = 24
region = "us-east-1"
```

**AWS Permissions:** `s3:ListBucket`

---

# INFRA Domain

Infrastructure validation.

## AWS Tagging (`[infra.tagging]`)

Verify AWS resources have required tags.

```toml
[infra.tagging]
enabled = true
region = "us-east-1"
required = ["Environment", "Owner", "CostCenter"]

[infra.tagging.values]
Environment = ["dev", "stag", "prod"]
```

**AWS Permissions:** `tag:GetResources`

---

# Utilities

## Project Detection (`cm projects detect`)

Discover projects in monorepos.

```bash
cm projects detect              # List all projects
cm projects detect --fix        # Create missing check.toml
cm projects detect --dry-run    # Preview without creating
cm projects detect --registry .cm  # Create shared registry
```

**Detected Project Types:**
| Marker File | Type |
|-------------|------|
| `package.json` | typescript |
| `pyproject.toml` | python |
| `Cargo.toml` | rust |
| `go.mod` | go |

---

## Registry & Extends

Inherit configuration from registries.

```toml
[extends]
registry = "github:myorg/standards"
rulesets = ["base", "typescript"]

# Local overrides
[code.linting.eslint]
enabled = true
```

**Registry Formats:**
- GitHub: `github:owner/repo` or `github:owner/repo@v1.0.0`
- Local: `/path/to/registry`

**Registry Structure:**
```
registry/
├── rulesets/
│   ├── base.toml
│   ├── typescript.toml
│   └── python.toml
```

---

# Full Configuration Example

```toml
# Extend from registry
[extends]
registry = "github:myorg/standards"
rulesets = ["typescript-internal"]

# =============================================================================
# CODE DOMAIN
# =============================================================================

# Linting
[code.linting.eslint]
enabled = true
max-warnings = 0

[code.linting.eslint.rules]
"no-unused-vars" = "error"
"complexity" = { severity = "error", max = 10 }

[code.linting.ruff]
enabled = true
format = true
line-length = 88

[code.linting.ruff.lint]
select = ["E", "F", "W", "I"]

# Formatting
[code.formatting.prettier]
enabled = true

# Type Checking
[code.types.tsc]
enabled = true

[code.types.tsc.require]
strict = true
noImplicitAny = true

[code.types.ty]
enabled = true

# Unused Code
[code.unused.knip]
enabled = true

[code.unused.vulture]
enabled = true

# Tests
[code.tests]
enabled = true
pattern = "**/*.{test,spec}.{ts,tsx,js,jsx}"
min_test_files = 5

# Security
[code.security.secrets]
enabled = true

[code.security.npmaudit]
enabled = true

[code.security.pipaudit]
enabled = true

# Naming
[code.naming]
enabled = true

[[code.naming.rules]]
extensions = ["ts", "tsx"]
file_case = "kebab-case"
folder_case = "kebab-case"

[[code.naming.rules]]
extensions = ["py"]
file_case = "snake_case"
folder_case = "snake_case"

# Quality
[code.quality.disable-comments]
enabled = true
exclude = ["tests/**"]

# =============================================================================
# PROCESS DOMAIN
# =============================================================================

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
dismiss_stale_reviews = true

[process.backups]
enabled = true
bucket = "my-backups"
prefix = "github/myorg/myrepo"
max_age_hours = 24

# =============================================================================
# INFRA DOMAIN
# =============================================================================

[infra.tagging]
enabled = true
region = "us-east-1"
required = ["Environment", "Owner", "CostCenter"]

[infra.tagging.values]
Environment = ["dev", "stag", "prod"]
```

---

# Tool Summary

## CODE Domain (14 tools)

| Category | Tool | Languages | Config |
|----------|------|-----------|--------|
| Linting | ESLint | JS/TS | `[code.linting.eslint]` |
| Linting | Ruff | Python | `[code.linting.ruff]` |
| Formatting | Prettier | JS/TS/CSS/JSON | `[code.formatting.prettier]` |
| Formatting | Ruff Format | Python | `[code.linting.ruff] format = true` |
| Types | tsc | TypeScript | `[code.types.tsc]` |
| Types | ty | Python | `[code.types.ty]` |
| Unused | Knip | JS/TS | `[code.unused.knip]` |
| Unused | Vulture | Python | `[code.unused.vulture]` |
| Tests | Built-in | Any | `[code.tests]` |
| Security | Gitleaks | Any | `[code.security.secrets]` |
| Security | npm audit | JS/TS | `[code.security.npmaudit]` |
| Security | pip-audit | Python | `[code.security.pipaudit]` |
| Naming | Built-in | Any | `[code.naming]` |
| Quality | Disable Comments | JS/TS/Python | `[code.quality.disable-comments]` |

## PROCESS Domain (8 checks)

| Check | Purpose | Config |
|-------|---------|--------|
| Hooks | Git hooks (Husky) | `[process.hooks]` |
| CI | GitHub workflows | `[process.ci]` |
| Branches | Naming patterns | `[process.branches]` |
| PR | Size limits | `[process.pr]` |
| Tickets | Reference validation | `[process.tickets]` |
| Coverage | Threshold enforcement | `[process.coverage]` |
| Repo | Branch protection, CODEOWNERS | `[process.repo]` |
| Backups | S3 backup verification | `[process.backups]` |

## INFRA Domain (1 check)

| Check | Purpose | Config |
|-------|---------|--------|
| Tagging | AWS resource tags | `[infra.tagging]` |

---

# Architecture

```
src/
├── cli.ts              # Commander.js CLI entry point
├── code/
│   ├── index.ts        # CODE domain runner
│   └── tools/          # 14 tool integrations
├── process/
│   ├── index.ts        # PROCESS domain runner
│   ├── tools/          # 8 check implementations
│   └── sync/           # Branch protection sync
├── infra/
│   ├── index.ts        # INFRA domain runner
│   └── tools/          # Tagging runner
├── config/
│   ├── loader.ts       # Config loading and merging
│   ├── schema.ts       # Zod schemas
│   └── registry.ts     # Registry resolution
├── projects/
│   └── index.ts        # Project detection
├── output/
│   └── index.ts        # Text and JSON formatters
└── types/
    └── index.ts        # Shared TypeScript types
```

# Features - check-my-toolkit v0.30.0

Unified project health checks for code quality, process compliance, and infrastructure validation.

## Overview

check-my-toolkit (`cm`) provides a single CLI to run multiple code quality, process, and infrastructure tools with unified configuration via `check.toml`. Three domains are fully implemented:

- **CODE** - 14 integrated tools for linting, formatting, type checking, security, and more
- **PROCESS** - 12 workflow checks for git hooks, CI, PRs, branches, commits, documentation, and repository settings
- **INFRA** - AWS resource tagging validation

---

## Quick Reference

| Domain | Tools | Config |
|--------|-------|--------|
| CODE | ESLint, Ruff, Prettier, tsc, ty, Knip, Vulture, Gitleaks, pnpm-audit, pip-audit | `[code.*]` |
| PROCESS | Hooks, CI, Branches, Commits, Changesets, PR, Tickets, Coverage, Repo, Backups, CODEOWNERS, Docs | `[process.*]` |
| INFRA | AWS Tagging | `[infra.*]` |

---

## Commands

### Aggregate Commands

Run all domains at once:

| Command | Description |
|---------|-------------|
| `cm check` | Run all checks (code + process + infra) |
| `cm audit` | Verify all configs exist (code + process + infra) |

These are equivalent to running each domain command separately:
- `cm check` = `cm code check` + `cm process check` + `cm infra check`
- `cm audit` = `cm code audit` + `cm process audit` + `cm infra audit`

### Domain Commands

Run checks for a specific domain:

| Command | Description |
|---------|-------------|
| `cm code check` | Run code quality checks |
| `cm code audit` | Verify code tool configs |
| `cm process check` | Run workflow validation |
| `cm process audit` | Verify workflow configs |
| `cm process diff` | Show branch protection differences |
| `cm process sync --apply` | Sync branch protection to GitHub |
| `cm process check-branch` | Validate branch name (for pre-push hook) |
| `cm process check-commit <file>` | Validate commit message (for commit-msg hook) |
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

Python linting (extremely fast).

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

## Test Coverage

### Coverage Run (`[code.coverage_run]`)

Run tests with coverage and validate against thresholds.

```toml
[code.coverage_run]
enabled = true
min_threshold = 80
command = "pnpm test:coverage"  # Optional: auto-detects if not specified
```

| Property | Value |
|----------|-------|
| `min_threshold` | Minimum coverage percentage required (0-100) |
| `command` | Custom test command (optional) |

**Auto-detected runners:** vitest, jest, pytest

**How it works:**
- Runs tests with coverage enabled
- Parses coverage output to extract percentage
- Fails if coverage is below `min_threshold`

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

### pnpm audit (`[code.security.pnpmaudit]`)

JavaScript dependency vulnerability scanning.

```toml
[code.security.pnpmaudit]
enabled = true
exclude_dev = true  # Only check production dependencies (default)
```

| Property | Value |
|----------|-------|
| `exclude_dev` | Skip devDependencies (default: true) |

Requires `pnpm-lock.yaml` in project root.

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

Verify Husky git hooks are installed and configured.

```toml
[process.hooks]
enabled = true
require_husky = true
require_hooks = ["pre-commit", "pre-push"]

[process.hooks.commands]
pre-commit = ["lint-staged"]
pre-push = ["npm test"]
```

| Property | Value |
|----------|-------|
| `require_husky` | Require `.husky/` directory exists |
| `require_hooks` | List of required hook files (e.g., `pre-commit`, `pre-push`, `commit-msg`) |
| `commands` | Map of hook name to required commands in that hook file |

**Violations detected:** Missing husky installation, missing hook files, hooks missing required commands.

---

## CI Workflows (`[process.ci]`)

Verify GitHub Actions workflows exist with required jobs and actions.

```toml
[process.ci]
enabled = true
require_workflows = ["ci.yml", "release.yml"]

[process.ci.jobs]
"ci.yml" = ["test", "lint", "build"]

[process.ci.actions]
"ci.yml" = ["actions/checkout", "actions/setup-node"]
```

| Property | Value |
|----------|-------|
| `require_workflows` | List of required workflow files in `.github/workflows/` |
| `jobs` | Map of workflow file to required job names |
| `actions` | Map of workflow file to required action uses |

**Violations detected:** Missing workflow files, missing jobs, missing actions.

---

## Branch Naming (`[process.branches]`)

Enforce branch naming conventions.

```toml
[process.branches]
enabled = true
pattern = "^(feature|fix|hotfix|docs)/v[0-9]+\\.[0-9]+\\.[0-9]+/.+"
exclude = ["main", "master", "develop"]
```

| Property | Value |
|----------|-------|
| `pattern` | Regex pattern for valid branch names |
| `exclude` | Branch names to skip validation (e.g., `main`, `develop`) |

**Tip:** Use `cm process check-branch` in pre-push hooks for local enforcement.

---

## PR Size Limits (`[process.pr]`)

Enforce PR size limits in CI.

```toml
[process.pr]
enabled = true
max_files = 20
max_lines = 500
```

| Property | Value |
|----------|-------|
| `max_files` | Maximum number of files changed in a PR |
| `max_lines` | Maximum total lines changed (additions + deletions) |

**Note:** Reads PR data from `GITHUB_EVENT_PATH` environment variable. Skips gracefully when not in a PR context.

---

## Ticket References (`[process.tickets]`)

Require ticket references in commits and/or branches.

```toml
[process.tickets]
enabled = true
pattern = "^(ABC|XYZ)-[0-9]+"
require_in_commits = true
require_in_branch = false
```

| Property | Value |
|----------|-------|
| `pattern` | Regex pattern for ticket IDs (e.g., `JIRA-123`, `GH-456`) |
| `require_in_commits` | Require ticket reference in commit messages |
| `require_in_branch` | Require ticket reference in branch name |

**Tip:** Use `cm process check-commit` in commit-msg hooks for local enforcement.

---

## Coverage Enforcement (`[process.coverage]`)

Verify coverage thresholds are configured in test tools or CI.

```toml
[process.coverage]
enabled = true
min_threshold = 80
enforce_in = "config"  # or "ci" or "both"
ci_workflow = "ci.yml"
ci_job = "test"
```

| Property | Value |
|----------|-------|
| `min_threshold` | Minimum coverage percentage required (0-100) |
| `enforce_in` | Where to check: `config`, `ci`, or `both` |
| `ci_workflow` | Workflow file to check (when `enforce_in` includes `ci`) |
| `ci_job` | Job name to check for coverage commands |

**Config locations checked:** vitest.config.ts, jest.config.js, .nycrc, package.json

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

## Commit Messages (`[process.commits]`)

Enforce commit message format (conventional commits or custom patterns).

```toml
[process.commits]
enabled = true
types = ["feat", "fix", "docs", "style", "refactor", "test", "chore"]
require_scope = false
max_subject_length = 72
```

| Property | Value |
|----------|-------|
| `types` | Allowed commit types (conventional commits) |
| `pattern` | Custom regex pattern (alternative to types) |
| `require_scope` | Require scope like `feat(api): ...` |
| `max_subject_length` | Maximum subject line length |

**Supported Formats:**
- Conventional commits: `feat: add login`, `fix(auth): resolve token issue`
- Custom regex patterns via `pattern` option

---

## Changesets (`[process.changesets]`)

Validate changeset files for versioning.

```toml
[process.changesets]
enabled = true
require_for_paths = ["src/**"]
exclude_paths = ["**/*.test.ts"]
validate_format = true
allowed_bump_types = ["patch", "minor"]
require_description = true
min_description_length = 10
```

| Property | Value |
|----------|-------|
| `require_for_paths` | Glob patterns that require changesets when modified |
| `exclude_paths` | Paths exempt from changeset requirement |
| `validate_format` | Validate frontmatter structure |
| `allowed_bump_types` | Restrict to specific bump types (`patch`, `minor`, `major`) |
| `require_description` | Require non-empty description |
| `min_description_length` | Minimum description character count |

**Detects:** Missing changesets for code changes, invalid format, missing descriptions, disallowed bump types.

---

## CODEOWNERS (`[process.codeowners]`)

Validate CODEOWNERS file contains required rules.

```toml
[process.codeowners]
enabled = true

[[process.codeowners.rules]]
pattern = "*"
owners = ["@myorg/engineering"]

[[process.codeowners.rules]]
pattern = "/docs/*"
owners = ["@myorg/docs-team"]

[[process.codeowners.rules]]
pattern = "*.ts"
owners = ["@myorg/typescript-team"]
```

| Property | Value |
|----------|-------|
| `rules` | Array of required CODEOWNERS rules |
| `rules[].pattern` | File pattern (e.g., `*`, `/src/*`, `*.ts`) |
| `rules[].owners` | Required owners (e.g., `@user`, `@org/team`) |

**Validation:**
- Checks CODEOWNERS file exists (`.github/CODEOWNERS`, `CODEOWNERS`, or `docs/CODEOWNERS`)
- Validates all configured rules exist with exact owner match
- Reports rules in CODEOWNERS not defined in config
- Supports registry inheritance (rules from registry and project config are merged)

---

## Documentation Governance (`[process.docs]`)

Validate documentation structure, content, freshness, and API coverage.

```toml
[process.docs]
enabled = true
path = "docs/"
enforcement = "warn"  # or "block"
staleness_days = 30
allowlist = ["README.md", "CLAUDE.md"]  # Markdown allowed outside docs/

# File limits
max_files = 50
max_file_lines = 1000
max_total_kb = 500

# API coverage
min_coverage = 80
coverage_paths = ["src/**/*.ts"]
exclude_patterns = ["**/*.test.ts"]

# Stale mappings (doc -> source)
[process.docs.stale_mappings]
"docs/api.md" = "src/api/"

# Content validation per doc type
[process.docs.types.api]
frontmatter = ["title", "version"]
required_sections = ["Overview", "Usage", "API Reference"]

[process.docs.types.guide]
frontmatter = ["title"]
required_sections = ["Introduction", "Getting Started"]
```

| Property | Value |
|----------|-------|
| `path` | Documentation directory (default: `docs/`) |
| `enforcement` | `warn` or `block` - violation severity |
| `staleness_days` | Days before doc is considered stale vs tracked source |
| `allowlist` | Markdown files allowed outside docs/ |
| `max_files` | Maximum markdown files in docs/ |
| `max_file_lines` | Maximum lines per file |
| `max_total_kb` | Maximum total size of docs/ |
| `min_coverage` | Minimum API documentation coverage (0-100) |
| `coverage_paths` | Glob patterns for source files to check coverage |
| `exclude_patterns` | Patterns to exclude from coverage |
| `stale_mappings` | Override doc-to-source mappings for freshness |
| `types` | Per-type validation rules (frontmatter, sections) |

**Validations:**
- Structure: Markdown files outside docs/ not in allowlist
- Content: Required frontmatter fields and sections per doc type
- Freshness: Docs not updated after tracked source changes
- Links: Broken internal markdown links
- API Coverage: Exported symbols not mentioned in docs

---

## Hook-Specific Commands

Commands designed for use in git hooks with minimal output.

### `cm process check-branch`

Validates current branch name against configured pattern. Use in pre-push hooks.

```bash
cm process check-branch           # Full output
cm process check-branch --quiet   # Minimal output for hooks
```

**Configuration:** Uses `[process.branches]` settings.

### `cm process check-commit <file>`

Validates commit message format and ticket references. Use in commit-msg hooks.

```bash
cm process check-commit .git/COMMIT_EDITMSG
cm process check-commit .git/COMMIT_EDITMSG --quiet
```

**Configuration:** Uses `[process.commits]` and `[process.tickets]` settings.

**Git Hook Example (.husky/commit-msg):**
```bash
#!/bin/sh
cm process check-commit "$1" --quiet
```

**Git Hook Example (.husky/pre-push):**
```bash
#!/bin/sh
cm process check-branch --quiet
```

**Auto-skipped commits:** Merge, Revert, fixup!, squash!, amend!

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

# Security
[code.security.secrets]
enabled = true

[code.security.pnpmaudit]
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

[process.commits]
enabled = true
types = ["feat", "fix", "docs", "style", "refactor", "test", "chore"]
require_scope = false
max_subject_length = 72

[process.changesets]
enabled = true
require_for_paths = ["src/**"]
validate_format = true
require_description = true

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

[process.codeowners]
enabled = true

[[process.codeowners.rules]]
pattern = "*"
owners = ["@myorg/engineering"]

[process.docs]
enabled = true
path = "docs/"
enforcement = "warn"
staleness_days = 30
allowlist = ["README.md", "CLAUDE.md"]

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
| Coverage | Coverage Run | Any | `[code.coverage_run]` |
| Security | Gitleaks | Any | `[code.security.secrets]` |
| Security | pnpm audit | JS/TS | `[code.security.pnpmaudit]` |
| Security | pip-audit | Python | `[code.security.pipaudit]` |
| Naming | Built-in | Any | `[code.naming]` |
| Quality | Disable Comments | JS/TS/Python | `[code.quality.disable-comments]` |

## PROCESS Domain (12 checks)

| Check | Purpose | Config |
|-------|---------|--------|
| Hooks | Git hooks (Husky) | `[process.hooks]` |
| CI | GitHub workflows | `[process.ci]` |
| Branches | Naming patterns | `[process.branches]` |
| Commits | Message format | `[process.commits]` |
| Changesets | Changeset validation | `[process.changesets]` |
| PR | Size limits | `[process.pr]` |
| Tickets | Reference validation | `[process.tickets]` |
| Coverage | Threshold enforcement | `[process.coverage]` |
| Repo | Branch protection | `[process.repo]` |
| Backups | S3 backup verification | `[process.backups]` |
| CODEOWNERS | CODEOWNERS validation | `[process.codeowners]` |
| Docs | Documentation governance | `[process.docs]` |

## INFRA Domain (1 check)

| Check | Purpose | Config |
|-------|---------|--------|
| Tagging | AWS resource tags | `[infra.tagging]` |

---

# Environment Variables

Some features require environment variables to be set:

| Variable | Used By | Purpose |
|----------|---------|---------|
| `GITHUB_TOKEN` | `process.repo`, `process diff/sync` | GitHub API access for branch protection |
| `GITHUB_EVENT_PATH` | `process.pr` | PR context in GitHub Actions |
| `AWS_REGION` | `infra.tagging`, `process.backups` | AWS region (can also use config) |
| `AWS_ACCESS_KEY_ID` | `infra.tagging`, `process.backups` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | `infra.tagging`, `process.backups` | AWS credentials |

**GitHub Actions example:**
```yaml
- name: Run checks
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: cm check
```

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
│   ├── tools/          # 11 check implementations
│   ├── commands/       # Hook-specific commands (check-branch, check-commit)
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

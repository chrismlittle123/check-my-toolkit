# PROCESS Domain Roadmap

Workflow and policy enforcement for git hooks, CI/CD, PRs, branches, repository settings, and operational compliance.

## Overview

The PROCESS domain validates development workflow compliance. It checks local tooling (git hooks), CI/CD configuration, PR policies, repository settings, and operational health.

```toml
[process]
├── [process.hooks]     # Git hooks (husky)
├── [process.ci]        # CI/CD workflows
├── [process.branches]  # Naming patterns
├── [process.pr]        # Size limits
├── [process.tickets]   # Linear/Jira references
├── [process.coverage]  # Coverage enforcement
├── [process.repo]      # Branch protection, CODEOWNERS
└── [process.backups]   # Repository backup verification
```

**Implementation order:** Start with local file checks (no API), then add GitHub API features.

---

## Trigger Cadence

Process checks can run on two cadences:

### Event-Driven (Gate/Block)
These checks run on specific events and can block merges:

| Check | Trigger Event | Purpose |
|-------|--------------|---------|
| `process.hooks` | pre-commit, pre-push | Enforce local tooling |
| `process.ci` | push, PR | Verify CI config exists |
| `process.branches` | push, PR | Enforce naming conventions |
| `process.pr` | PR open/update | Limit PR size |
| `process.tickets` | PR open/update | Require ticket references |

### Schedule-Driven (Audit/Monitor)
These checks run on a schedule (cron) to detect drift or verify operational health:

| Check | Suggested Schedule | Purpose |
|-------|-------------------|---------|
| `process.repo` | Daily | Detect branch protection drift |
| `process.coverage` | Nightly | Monitor coverage thresholds |
| `process.backups` | Daily | Verify backup recency |

**CI/CD Integration:**
```yaml
# Event-driven (on PR)
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: npx cm process check

# Schedule-driven (daily audit)
on:
  schedule:
    - cron: '0 6 * * *'  # 6am daily
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - run: npx cm process check --audit
```

---

## v1.0 — Local Workflow Checks (No API Required)

### Git Hooks: `[process.hooks]`

**Complexity: Low** — File existence checks only.

| Check | Description | Data Source |
|-------|-------------|-------------|
| Husky installed | `.husky/` directory exists | Local filesystem |
| Required hooks | Specific hook files exist | Local filesystem |
| Hook contains command | Hook file contains expected command | File content |

```toml
[process.hooks]
enabled = true
require_husky = true
require_hooks = ["pre-commit", "pre-push"]

# Optional: verify hooks run specific commands
[process.hooks.commands]
pre-commit = ["lint-staged"]
pre-push = ["npm test", "npm run typecheck"]
```

**Implementation:**
1. Check `.husky/` directory exists
2. Check each required hook file exists (e.g., `.husky/pre-commit`)
3. Optionally grep hook files for required commands

**Output:**
```
[process.hooks]
  ✓ Husky installed (.husky/ exists)
  ✓ pre-commit hook configured
  ✗ pre-push hook missing
  ✓ pre-commit runs 'lint-staged'

process: 1 violation found
```

---

### CI/CD Workflows: `[process.ci]`

**Complexity: Low-Medium** — File existence + YAML parsing.

| Check | Description | Data Source |
|-------|-------------|-------------|
| Workflows exist | Required workflow files present | `.github/workflows/` |
| Jobs exist | Required jobs in workflows | YAML parsing |
| Steps exist | Required steps in jobs | YAML parsing |

```toml
[process.ci]
enabled = true
require_workflows = ["ci.yml", "release.yml"]

# Optional: verify specific jobs exist
[process.ci.jobs]
"ci.yml" = ["test", "lint", "typecheck", "build"]
"release.yml" = ["publish"]

# Optional: verify specific steps/actions used
[process.ci.actions]
"ci.yml" = ["actions/checkout", "actions/setup-node"]
```

**Implementation:**
1. Check `.github/workflows/` directory exists
2. Check each required workflow file exists
3. Parse YAML and verify required jobs exist
4. Optionally check for specific actions/steps

**Output:**
```
[process.ci]
  ✓ ci.yml workflow exists
  ✗ release.yml workflow missing
  ✓ ci.yml has job 'test'
  ✓ ci.yml has job 'lint'
  ✗ ci.yml missing job 'typecheck'

process: 2 violation(s) found
```

---

### Branch Naming: `[process.branches]`

**Complexity: Low** — Git command + regex.

| Check | Description | Data Source |
|-------|-------------|-------------|
| Pattern match | Branch name matches pattern | `git branch --show-current` |

```toml
[process.branches]
enabled = true
pattern = "^(feature|fix|hotfix|docs)/v[0-9]+\\.[0-9]+\\.[0-9]+/[a-z0-9-]+$"
exclude = ["main", "master", "develop"]
```

**Implementation:**
1. Get current branch: `git branch --show-current`
2. Check if branch is in exclude list (skip if so)
3. Match against regex pattern

**Output:**
```
[process.branches]
  ✓ Branch 'feature/v0.19.0/add-hooks' matches pattern

process: passed
```

---

## v1.1 — PR & Ticket Validation (GitHub Context)

### PR Checks: `[process.pr]`

**Complexity: Medium** — Requires GitHub Actions context or API.

| Check | Description | Data Source |
|-------|-------------|-------------|
| PR size (files) | Max files changed in PR | GitHub API / Event payload |
| PR size (lines) | Max lines changed | GitHub API / Event payload |

```toml
[process.pr]
enabled = true
max_files = 20
max_lines = 400
```

**Behavior:**
- If not in PR context (no `GITHUB_*` env vars), skip with warning
- In CI: read from `GITHUB_EVENT_PATH` payload
- Locally with `--pr <number>`: fetch via GitHub API

**GitHub Context:**
- `GITHUB_EVENT_PATH` - PR event payload (JSON)
- `GITHUB_TOKEN` - API authentication (if needed)

---

### Ticket Reference: `[process.tickets]`

**Complexity: Medium** — Requires PR context.

| Check | Description | Data Source |
|-------|-------------|-------------|
| Pattern in locations | Ticket ID in title/body/branch | PR title, body, branch |

```toml
[process.tickets]
enabled = true
pattern = "[A-Z]+-[0-9]+"
check_in = ["title", "branch", "body"]
require_all = false  # true = must be in ALL locations
```

**Output:**
```
[process.pr]
  ✗ PR has 35 files changed (max: 20)
  ✓ PR has 280 lines changed (max: 400)

[process.tickets]
  ✓ Ticket 'ABC-123' found in branch

process: 1 violation found
```

---

## v1.2 — Coverage & Repo Settings

### Coverage Enforcement: `[process.coverage]`

**Complexity: Medium** — Depends on implementation approach.

| Check | Description | Data Source |
|-------|-------------|-------------|
| Threshold in CI | Coverage check exists in workflow | YAML parsing |
| Coverage config | Coverage tool configured | Config files |

```toml
[process.coverage]
enabled = true
min_threshold = 80

# Where to verify coverage is enforced
enforce_in = "ci"  # "ci" | "config" | "both"

# For CI enforcement: which workflow/job
ci_workflow = "ci.yml"
ci_job = "test"
```

**Implementation options:**
1. **CI check**: Parse workflow YAML for coverage commands/thresholds
2. **Config check**: Verify vitest/jest/nyc config has threshold
3. **Both**: Ensure coverage is configured and enforced

---

### Repository Settings: `[process.repo]`

**Complexity: High** — Requires GitHub API with appropriate permissions.

| Check | Description | Data Source |
|-------|-------------|-------------|
| Branch protection | Required reviews, status checks | GitHub API |
| CODEOWNERS | File exists and valid | Local + GitHub |

```toml
[process.repo]
enabled = true
require_branch_protection = true
require_codeowners = true

[process.repo.branch_protection]
branch = "main"
required_reviews = 1
require_status_checks = ["ci"]
```

---

## v1.3 — Backup Verification

### Repository Backups: `[process.backups]`

**Complexity: Medium-High** — Requires integration with backup service APIs.

| Check | Description | Data Source |
|-------|-------------|-------------|
| Backup exists | Repository has been backed up | Backup service API |
| Backup recency | Last backup within threshold | Backup service API |
| Backup completeness | All required repos backed up | Backup service API |

```toml
[process.backups]
enabled = true

# Backup service configuration
provider = "s3"  # "s3" | "gcs" | "azure" | "custom"

# For S3/cloud storage
bucket = "my-org-repo-backups"
prefix = "github/"  # Optional path prefix

# Recency requirements
max_age_hours = 24  # Fail if last backup older than this

# Custom webhook (alternative to cloud storage)
# webhook_url = "https://backup-service.example.com/api/status"
```

**Implementation Options:**

1. **Cloud Storage Check** (S3/GCS/Azure):
   - List objects in bucket with repo name prefix
   - Check most recent object timestamp
   - Verify backup file exists and is recent

2. **Custom Webhook**:
   - Call organization's backup service API
   - Service returns backup status for repo
   - Flexible integration with any backup solution

3. **Git Bundle Verification**:
   - Check for `.git-bundle` files in backup location
   - Verify bundle is valid and recent

**Output:**
```
[process.backups]
  ✓ Backup found: s3://backups/github/myorg/myrepo/2024-01-15.tar.gz
  ✓ Backup age: 6 hours (max: 24 hours)

process: passed
```

**Failure Example:**
```
[process.backups]
  ✗ No backup found for repository 'myorg/myrepo'
  ✗ Last backup: 3 days ago (max: 24 hours)

process: 2 violation(s) found
```

**Schedule:** Run daily via cron to catch backup failures early.

---

## v1.4 — Sync to GitHub

`cm process sync` pushes config to GitHub API:

- Update branch protection rules
- Set merge strategy
- Configure required status checks

```bash
cm process diff   # Preview changes
cm process sync   # Apply changes
```

This is the killer feature: declaratively define repo settings in `check.toml` and sync them across all repos.

---

## Implementation Priority

Ordered by complexity (start here):

| Priority | Feature | Complexity | Dependencies | Cadence |
|----------|---------|------------|--------------|---------|
| 1 | `[process.hooks]` ✅ | Low | None (file checks) | Event |
| 2 | `[process.ci]` ✅ | Low-Medium | YAML parser | Event |
| 3 | `[process.branches]` ✅ | Low | Git CLI | Event |
| 4 | `[process.pr]` | Medium | GitHub context | Event |
| 5 | `[process.tickets]` | Medium | GitHub context | Event |
| 6 | `[process.coverage]` | Medium | YAML + config parsing | Schedule |
| 7 | `[process.repo]` | High | GitHub API | Schedule |
| 8 | `[process.backups]` | Medium-High | Cloud SDK / webhook | Schedule |
| 9 | `cm process sync` | High | GitHub API + write access | Manual |

**Implemented:** hooks, ci, branches

**Next up:** pr, tickets (event-driven, GitHub context required)

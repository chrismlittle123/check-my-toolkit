# PROCESS Domain Roadmap

Workflow and policy enforcement for PRs, branches, and repository settings.

## Overview

The PROCESS domain validates development workflow compliance through GitHub API integration. It checks PR size, branch naming, ticket references, and repository configuration.

```toml
[process]
├── [process.pr]        # Size limits
├── [process.branches]  # Naming patterns
├── [process.tickets]   # Linear/Jira references required
└── [process.repo]      # Branch protection, CODEOWNERS
```

**Note:** PROCESS domain development starts after CODE domain is stable.

---

## v1.0 — PR & Branch Validation

### PR Checks: `[process.pr]`

| Check | Description | Data Source |
|-------|-------------|-------------|
| PR size (files) | Max files changed in PR | GitHub API |
| PR size (lines) | Max lines changed | GitHub API |

```toml
[process.pr]
max_files = 20
max_lines = 400
```

**Behavior:**
- If not in PR context (no `GITHUB_*` env vars), skip PR-specific checks
- Collect violations, report in unified format

### Branch Naming: `[process.branches]`

| Check | Description | Data Source |
|-------|-------------|-------------|
| Pattern match | Branch name matches pattern | Current branch name |

```toml
[process.branches]
pattern = "^(feature|fix|hotfix)/[A-Z]+-[0-9]+-[a-z0-9-]+$"
```

### Ticket Reference: `[process.tickets]`

| Check | Description | Data Source |
|-------|-------------|-------------|
| Pattern in locations | Ticket ID in title/body/branch | PR title, body, branch |

```toml
[process.tickets]
pattern = "[A-Z]+-[0-9]+"
check_in = ["title", "branch", "body"]
```

### Output Format

```
[process.pr]
  ✗ PR has 35 files changed (max: 20)
  ✓ PR has 280 lines changed (max: 400)

[process.branches]
  ✓ Branch 'feature/ABC-123-add-login' matches pattern

[process.tickets]
  ✓ Ticket 'ABC-123' found in branch

process: 1 violation found
```

### GitHub Context

PR information from environment variables:
- `GITHUB_REF` - Branch ref
- `GITHUB_HEAD_REF` - PR head branch
- `GITHUB_EVENT_PATH` - PR event payload
- `GITHUB_TOKEN` - API authentication

If not in GitHub Actions, PR checks are skipped with a warning.

---

## v1.1 — Repo Settings

### Repository Settings: `[process.repo]`

| Check | Description | Data Source |
|-------|-------------|-------------|
| Branch protection | Required reviews, status checks enabled | GitHub API |
| CODEOWNERS | File exists and valid | Local + GitHub |

```toml
[process.repo]
require_branch_protection = true
require_codeowners = true
```

---

## v1.2 — Sync to GitHub

`cm process sync` pushes config to GitHub API:

- Update branch protection rules
- Set merge strategy
- Configure required status checks

```bash
cm process diff   # Preview changes
cm process sync   # Apply changes
```

This is the killer feature: declaratively define repo settings in `check.toml` and sync them across all repos.

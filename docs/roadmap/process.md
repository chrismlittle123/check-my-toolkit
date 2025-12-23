# PROCESS Domain Roadmap

Workflow and policy enforcement for PRs, branches, commits, and repository settings.

## Overview

The PROCESS domain validates development workflow compliance through GitHub API integration. It checks PR size, branch naming, ticket references, and repository configuration.

```toml
[process]
├── [process.pr]        # Size limits, title format, approvals
├── [process.commits]   # Conventional commits, sign-off
├── [process.branches]  # Naming patterns
├── [process.tickets]   # Linear/Jira references required
├── [process.ci]        # Required workflows, coverage enforcement
└── [process.repo]      # Branch protection, CODEOWNERS, labels
```

**Note:** PROCESS domain development starts after CODE domain is stable.

---

## v1.0 — PR & Branch Validation

### PR Checks: `[process.pr]`

| Check | Description | Data Source |
|-------|-------------|-------------|
| PR size (files) | Max files changed in PR | GitHub API |
| PR size (lines) | Max lines changed | GitHub API |
| Approvals | Minimum approvals received | GitHub API |

```toml
[process.pr]
max_files = 20
max_lines = 400
min_approvals = 1
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
  ✗ PR has 0 approvals (min: 1)

[process.branches]
  ✓ Branch 'feature/ABC-123-add-login' matches pattern

[process.tickets]
  ✓ Ticket 'ABC-123' found in branch

process: 2 violations found
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
| Branch protection | Required reviews, status checks | GitHub API |
| CODEOWNERS | File exists and valid | Local + GitHub |
| Labels | Required labels exist | GitHub API |

```toml
[process.repo]
require_branch_protection = true
require_codeowners = true
required_labels = ["bug", "feature", "breaking"]
```

---

## v1.2 — Commits & CI

### Commits: `[process.commits]`

| Check | Description | Data Source |
|-------|-------------|-------------|
| Conventional commits | Commit messages follow convention | Git log |
| Sign-off | Commits have DCO sign-off | Git log |

```toml
[process.commits]
conventional = true
require_signoff = false
```

### CI/CD Checks: `[process.ci]`

| Check | Description | Data Source |
|-------|-------------|-------------|
| GitHub Actions exist | Required workflows in .github/workflows | Local filesystem |
| Actions configured | Required checks run on PRs | GitHub API |
| Coverage enforcement | Coverage threshold is a required check | GitHub API |

```toml
[process.ci]
required_workflows = ["lint.yml", "test.yml"]
require_status_checks = true
require_coverage_check = true
min_coverage_threshold = 80
```

---

## v1.3 — Sync to GitHub

`cm process sync` pushes config to GitHub API:

- Update branch protection rules
- Set merge strategy
- Configure required status checks

```bash
cm process diff   # Preview changes
cm process sync   # Apply changes
```

---

## v1.4 — Tickets (Linear/Jira)

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

---

## Future

| Check | Description | Tool/API |
|-------|-------------|----------|
| PR templates | Required template usage | GitHub API |
| Review SLAs | Max time to review | GitHub API |
| Changelog | Enforced updates | changesets |
| Release process | Tag format, versioning | semantic-release |
| Deployment gates | Environment protection | GitHub API |
| Stale issues | Auto-close stale | actions/stale |

# check-my-process Roadmap

Part of the unified `check-my-toolkit` CLI (`cm process <action>`).

---

## Purpose

Workflow and policy enforcement. Validates PRs, GitHub settings, Linear workflow, and required files against your `check.toml` config.

---

## v0.1 — MVP

**Goal:** Validate PR compliance using GitHub API.

### Checks

| Check | Description | Data Source |
|-------|-------------|-------------|
| PR size (files) | Max files changed in PR | GitHub API |
| PR size (lines) | Max lines changed | GitHub API |
| Branch naming | Branch name matches pattern | GitHub API |
| Ticket reference | Linear ticket in title/body/branch | GitHub API |
| Approvals | Minimum approvals received | GitHub API |

### Config

```toml
[settings]
default_severity = "error"

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

### CLI

```bash
# Check a PR
cm process check --repo owner/repo --pr 123

# Output formats
cm process check --repo owner/repo --pr 123 --format json
cm process check --repo owner/repo --pr 123 --ci
```

**Environment:** `GITHUB_TOKEN` required.

### Output

**Text:**
```
cm process check v0.1.0

PR #123: Add user authentication

  [PASS] process.pr.max_files: 8 files (max: 20)
  [PASS] process.pr.max_lines: 142 lines (max: 400)
  [FAIL] process.branch.pattern: "fix-auth-bug" does not match pattern
         Expected: ^(feature|fix|hotfix)/[A-Z]+-[0-9]+-[a-z0-9-]+$
  [FAIL] process.ticket.pattern: No ticket reference found
         Pattern: [A-Z]+-[0-9]+
         Checked: title, branch, body
  [PASS] process.pr.min_approvals: 2 approvals (min: 1)

Result: 3 passed, 2 failed
```

**JSON:**
```json
{
  "domain": "process",
  "pr": { "number": 123, "title": "Add user authentication" },
  "passed": 3,
  "failed": 2,
  "results": [
    { "rule": "process.pr.max_files", "status": "pass", "message": "8 files (max: 20)" },
    { "rule": "process.branch.pattern", "status": "fail", "severity": "error", "expected": "...", "actual": "fix-auth-bug" }
  ]
}
```

---

## v0.2 — GitHub Repo Settings

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

---

## v0.3 — Sync to GitHub

`cm process sync` pushes config to GitHub API:

- Update branch protection rules
- Set merge strategy
- Configure required status checks

```bash
cm process diff   # Preview changes
cm process sync   # Apply changes
```

---

## v0.4 — Linear Integration

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

**Git → Linear sync:** `cm process sync` updates Linear ticket state from Git.

---

## Future

| Check | Description | Tool/API |
|-------|-------------|----------|
| PR templates | Required template usage | GitHub API |
| Review SLAs | Max time to review | GitHub API |
| Changelog | Enforced updates | changesets |
| Release process | Tag format, versioning | semantic-release |
| CI/CD checks | Required workflows | GitHub API |
| Deployment gates | Environment protection | GitHub API |
| Stale issues | Auto-close stale | actions/stale |

---

## Tech Stack

| Component | Choice |
|-----------|--------|
| Language | TypeScript |
| CLI | Commander.js (shared) |
| Config | check.toml via @iarna/toml + Zod |
| GitHub API | @octokit/rest |
| Linear API | @linear/sdk |
| Output | chalk (text), JSON |

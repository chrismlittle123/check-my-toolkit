# PROCESS Domain Roadmap

GitHub repository process standards validation for drift-toolkit integration.

## Overview

The PROCESS domain validates GitHub repository settings, branch protection, required files, commit conventions, and CI/CD configuration.

**Two modes:**

| Command            | Timing          | Purpose                   | Data Source      |
| ------------------ | --------------- | ------------------------- | ---------------- |
| `cm process check` | Pre-production  | Preventative (PR/CI)      | Local filesystem |
| `cm process scan`  | Post-deployment | Detective (drift-toolkit) | GitHub API       |

```toml
[process]
├── [process.branches]       # Branch protection settings
├── [process.required_files] # Required repository files
├── [process.commits]        # Commit message format
├── [process.pull_requests]  # PR requirements
└── [process.ci]             # CI/CD workflow requirements
```

---

## `cm process check` Command

**Purpose:** Local validation of process standards at PR/CI time. Checks files and configurations that can be validated without API calls.

**Timing:** Pre-production (preventative)

### CLI Interface

```bash
# Run all local process checks
cm process check

# Check specific category
cm process check --category commits
cm process check --category ci

# JSON output
cm process check --json
```

### What It Checks (Local)

- Commit message format (conventional commits)
- Required files exist (CODEOWNERS, PR template, etc.)
- Workflow files exist and are valid
- Branch naming conventions

---

## `cm process scan` Command

**Purpose:** Remote validation of process standards via GitHub API. Used by drift-toolkit for scheduled scans to detect configuration drift.

**Timing:** Post-deployment (detective)

### CLI Interface

```bash
# Scan current repository (requires GITHUB_TOKEN)
cm process scan

# Scan specific repository
cm process scan --repo owner/repo

# Scan specific category
cm process scan --category branches
cm process scan --category required_files

# JSON output (for drift-toolkit)
cm process scan --json
```

### Output Format

**Human-readable:**

```
Process Validation Results
==========================

Repository: myorg/my-app

✓ Branch protection enabled
✗ Required reviews: expected 2, actual 1
✓ Status checks required
✗ Missing required status check: build
✓ CODEOWNERS file exists
✗ PR template missing
✓ Conventional commits enforced

Issues:
-------

VIOLATION: Branch protection - required_reviews
  Expected: 2
  Actual: 1
  Path: Settings > Branches > main

VIOLATION: Missing required status check
  Expected: ["test", "lint", "build"]
  Missing: ["build"]
  Path: Settings > Branches > main > Status checks

VIOLATION: Required file missing
  File: .github/pull_request_template.md
  Action: Create PR template
```

**JSON output (`--json`):**

```json
{
  "valid": false,
  "repository": "myorg/my-app",
  "timestamp": "2024-01-15T10:30:00Z",
  "summary": {
    "passed": 5,
    "failed": 3,
    "warnings": 1
  },
  "checks": [
    {
      "category": "branches",
      "check": "required_reviews",
      "status": "fail",
      "expected": 2,
      "actual": 1
    },
    {
      "category": "required_files",
      "check": "pr_template",
      "status": "fail",
      "expected": true,
      "actual": false,
      "path": ".github/pull_request_template.md"
    }
  ]
}
```

---

## check.toml Configuration

### Branch Protection: `[process.branches]`

```toml
[process.branches]
enabled = true
default_branch = "main"
protection = true
required_reviews = 2
dismiss_stale_reviews = true
require_code_owner_review = true
require_status_checks = true
required_status_checks = ["test", "lint", "build"]
enforce_admins = false
allow_force_push = false
allow_deletions = false
```

| Setting                     | Description                               |
| --------------------------- | ----------------------------------------- |
| `default_branch`            | Branch to validate protection on          |
| `protection`                | Branch protection must be enabled         |
| `required_reviews`          | Minimum number of approving reviews       |
| `dismiss_stale_reviews`     | Dismiss approvals when new commits pushed |
| `require_code_owner_review` | Require review from code owners           |
| `require_status_checks`     | Require status checks to pass             |
| `required_status_checks`    | Specific checks that must pass            |
| `enforce_admins`            | Apply rules to administrators             |
| `allow_force_push`          | Allow force pushes to protected branch    |
| `allow_deletions`           | Allow branch deletion                     |

### Required Files: `[process.required_files]`

```toml
[process.required_files]
enabled = true
codeowners = true
codeowners_path = ".github/CODEOWNERS"
pr_template = true
pr_template_path = ".github/pull_request_template.md"
issue_templates = true
contributing = false
license = false
```

| Setting            | Description                          |
| ------------------ | ------------------------------------ |
| `codeowners`       | CODEOWNERS file must exist           |
| `codeowners_path`  | Expected path for CODEOWNERS         |
| `pr_template`      | PR template must exist               |
| `pr_template_path` | Expected path for PR template        |
| `issue_templates`  | Issue templates directory must exist |
| `contributing`     | CONTRIBUTING.md must exist           |
| `license`          | LICENSE file must exist              |

### Commit Conventions: `[process.commits]`

```toml
[process.commits]
enabled = true
conventional = true
allowed_types = ["feat", "fix", "docs", "chore", "refactor", "test", "ci"]
require_scope = false
max_subject_length = 72
```

| Setting              | Description                           |
| -------------------- | ------------------------------------- |
| `conventional`       | Enforce conventional commit format    |
| `allowed_types`      | Valid commit type prefixes            |
| `require_scope`      | Require scope in commit message       |
| `max_subject_length` | Maximum length of commit subject line |

### Pull Request Requirements: `[process.pull_requests]`

```toml
[process.pull_requests]
enabled = true
require_linked_issue = false
require_labels = true
required_labels = ["type:*"]  # glob pattern
max_files_changed = 50  # warning threshold
```

| Setting                | Description                       |
| ---------------------- | --------------------------------- |
| `require_linked_issue` | PR must reference an issue        |
| `require_labels`       | PR must have labels               |
| `required_labels`      | Specific label patterns required  |
| `max_files_changed`    | Warn if PR touches too many files |

### CI/CD Requirements: `[process.ci]`

```toml
[process.ci]
enabled = true
required_workflows = ["test.yml", "lint.yml"]
workflow_path = ".github/workflows"
```

| Setting              | Description                    |
| -------------------- | ------------------------------ |
| `required_workflows` | Workflow files that must exist |
| `workflow_path`      | Directory containing workflows |

---

## Implementation Details

### Check vs Scan

| Command            | Use Case                      | Data Source      |
| ------------------ | ----------------------------- | ---------------- |
| `cm process check` | PR-time, CI pipelines         | Local filesystem |
| `cm process scan`  | drift-toolkit scheduled scans | GitHub API       |

**Check (local):**

- Validate commit messages
- Verify required files exist
- Parse workflow files
- Fast, no API calls

**Scan (remote):**

- Query GitHub API for branch protection settings
- Verify repository settings match check.toml
- Check file existence via Contents API
- Requires `GITHUB_TOKEN`

### GitHub API Endpoints

| Endpoint                                                 | Purpose             |
| -------------------------------------------------------- | ------------------- |
| `GET /repos/{owner}/{repo}`                              | Repository settings |
| `GET /repos/{owner}/{repo}/branches/{branch}/protection` | Branch protection   |
| `GET /repos/{owner}/{repo}/contents/{path}`              | File existence      |
| `GET /repos/{owner}/{repo}/actions/workflows`            | Workflow list       |
| `GET /repos/{owner}/{repo}/rulesets`                     | Repository rulesets |

### Programmatic API

```typescript
import { validateProcess } from "check-my-toolkit";

const result = await validateProcess({
  projectPath: ".", // for local checks
  repository: "myorg/my-app", // for remote checks
  token: process.env.GITHUB_TOKEN,
  categories: ["branches", "required_files"], // optional filter
});

// result.valid: boolean
// result.checks: ProcessCheck[]
// result.summary: { passed, failed, warnings }
```

---

## Implementation Priority

| Phase | Feature                  | Enables              |
| ----- | ------------------------ | -------------------- |
| 2     | Process standards schema | `drift process scan` |
| 2     | `cm process check`       | PR-time validation   |
| 2     | `cm process scan`        | `drift process scan` |

---

## Implementation Status

| Feature                           | Status     |
| --------------------------------- | ---------- |
| `[process.branches]` schema       | 📋 Planned |
| `[process.required_files]` schema | 📋 Planned |
| `[process.commits]` schema        | 📋 Planned |
| `[process.pull_requests]` schema  | 📋 Planned |
| `[process.ci]` schema             | 📋 Planned |
| `cm process check`                | 📋 Planned |
| `cm process scan`                 | 📋 Planned |

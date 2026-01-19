# PROCESS Domain Roadmap

GitHub repository process standards validation for drift-toolkit integration.

## Overview

The PROCESS domain validates GitHub repository settings, branch protection, required files, commit conventions, and CI/CD configuration. It enables both local validation (at PR time) and remote validation (scheduled scans via drift-toolkit).

```toml
[process]
├── [process.branches]      # Branch protection settings
├── [process.required_files] # Required repository files
├── [process.commits]       # Commit message format
├── [process.pull_requests] # PR requirements
└── [process.ci]            # CI/CD workflow requirements
```

---

## `cm process validate` Command

**Purpose:** Validates process standards defined in check.toml against actual GitHub repository state.

**Priority:** Medium (enables `drift process scan`)

### CLI Interface

```bash
# Validate process standards (local)
cm process validate

# Validate specific category
cm process validate --category branches
cm process validate --category required_files

# JSON output
cm process validate --json

# Remote validation (for drift-toolkit)
cm process validate --repo owner/repo --token $GITHUB_TOKEN
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

### Local vs Remote Validation

| Mode   | Use Case                        | Data Source |
| ------ | ------------------------------- | ----------- |
| Local  | PR-time checks, CI              | Filesystem  |
| Remote | Scheduled scans (drift-toolkit) | GitHub API  |

**Local validation:**

- Check file existence
- Parse workflow files
- Validate commit messages

**Remote validation:**

- Query GitHub API for branch protection settings
- Check repository settings
- Verify file existence via Contents API

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

| Phase | Feature                     | Enables              |
| ----- | --------------------------- | -------------------- |
| 2     | Process standards schema    | `drift process scan` |
| 2     | `process validate` (local)  | PR-time validation   |
| 2     | `process validate` (remote) | `drift process scan` |

---

## Implementation Status

| Feature                           | Status     |
| --------------------------------- | ---------- |
| `[process.branches]` schema       | 📋 Planned |
| `[process.required_files]` schema | 📋 Planned |
| `[process.commits]` schema        | 📋 Planned |
| `[process.pull_requests]` schema  | 📋 Planned |
| `[process.ci]` schema             | 📋 Planned |
| `cm process validate` (local)     | 📋 Planned |
| `cm process validate` (remote)    | 📋 Planned |

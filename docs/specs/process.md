# PROCESS Domain Spec

Repository workflow and process standards validation.

## Overview

The PROCESS domain validates git hooks, CI workflows, branch naming, commit conventions, changesets, and repository configuration. It can both check local compliance and sync settings to GitHub.

```
[process]
├── hooks              # Git hooks (husky) validation
├── ci                 # CI/CD workflow requirements
├── branches           # Branch naming conventions
├── commits            # Commit message format
├── changesets         # Changeset file validation
├── pr                 # Pull request size limits
├── tickets            # Ticket references in branches/commits
├── coverage           # Test coverage requirements
├── repo               # GitHub repository settings (rulesets)
├── codeowners         # CODEOWNERS file validation
├── docs               # Documentation governance
├── forbidden_files    # Files that must NOT exist
└── backups            # S3 backup verification
```

---

## Commands

### `cm process check`

Run all local process validations.

```bash
cm process check              # Run all checks
cm process check --format json   # JSON output
```

### `cm process scan`

Scan remote repository settings via GitHub API without needing to clone the repo.

```bash
cm process scan --repo owner/repo         # Scan remote repository
cm process scan --repo owner/repo --json  # JSON output
```

**Requires:** `GITHUB_TOKEN` environment variable or `gh` CLI authentication.

**What it checks:**

- Repository rulesets (branch protection, tag protection)
- Required file existence (CODEOWNERS, README, PR templates)
- Ruleset settings validation against `check.toml` configuration

### `cm process audit`

Verify all process tool configs exist (doesn't run checks).

```bash
cm process audit
```

### `cm process diff`

Compare local check.toml settings vs current GitHub repository rulesets.

```bash
cm process diff               # Show differences
cm process diff --json        # JSON output
```

### `cm process sync`

Sync ruleset settings from check.toml to GitHub.

```bash
cm process sync               # Sync settings (requires gh CLI)
cm process sync --dry-run     # Preview changes without applying
```

### `cm process check-branch`

Git hook command to validate branch names. Used in pre-push hooks.

```bash
cm process check-branch [--quiet]
```

### `cm process check-commit <file>`

Git hook command to validate commit messages. Used in commit-msg hooks.

```bash
cm process check-commit .git/COMMIT_EDITMSG [--quiet]
```

---

## Configuration

### Git Hooks: `[process.hooks]`

Validate git hooks are configured (typically via husky).

```toml
[process.hooks]
enabled = true
require_husky = true                           # Require .husky/ directory
require_hooks = ["pre-commit", "pre-push"]     # Required hook files
protected_branches = ["main", "master"]        # Branches to protect from direct push

[process.hooks.commands]
pre-commit = ["lint-staged"]                   # Commands required in pre-commit
pre-push = ["cm process check-branch"]         # Commands required in pre-push
```

### CI Workflows: `[process.ci]`

Validate GitHub Actions workflows exist and contain required elements.

```toml
[process.ci]
enabled = true
require_workflows = ["ci.yml", "release.yml"]  # Workflow files that must exist

[process.ci.jobs]
"ci.yml" = ["test", "lint", "build"]           # Required jobs in workflow

[process.ci.actions]
"ci.yml" = ["actions/checkout", "actions/setup-node"]  # Required actions

[process.ci.commands]
# Commands required anywhere in workflow
"ci.yml" = ["cm code check", "pnpm test"]

# Or target specific jobs
"ci.yml".test = ["pnpm test"]
"ci.yml".lint = ["cm code check"]
```

### Branch Naming: `[process.branches]`

Enforce branch naming conventions.

```toml
[process.branches]
enabled = true
pattern = "^(feature|fix|hotfix|docs)/[a-z0-9-]+$"  # Regex pattern
exclude = ["main", "master", "develop"]              # Branches to skip
require_issue = true                                 # Require issue number
issue_pattern = "/(\\d+)/"                           # Regex to extract issue number
```

### Commit Messages: `[process.commits]`

Enforce commit message conventions.

```toml
[process.commits]
enabled = true
pattern = "^(feat|fix|docs|chore|refactor|test|ci)(\\(.+\\))?: .+"  # Regex pattern
types = ["feat", "fix", "docs", "chore", "refactor", "test", "ci"]  # Allowed types
require_scope = false                          # Require scope like feat(api): ...
max_subject_length = 72                        # Max length of subject line
```

### Changesets: `[process.changesets]`

Validate changeset files for versioning.

```toml
[process.changesets]
enabled = true
require_for_paths = ["src/**", "packages/**"]  # Paths that require changesets
exclude_paths = ["**/*.test.ts", "**/*.md"]    # Paths exempt from requirement
validate_format = true                          # Validate changeset file format
allowed_bump_types = ["patch", "minor"]         # Restrict bump types (no major)
require_description = true                      # Require non-empty description
min_description_length = 10                     # Minimum description length
```

### Pull Requests: `[process.pr]`

Enforce PR size limits and requirements.

```toml
[process.pr]
enabled = true
max_files = 50                                 # Max files changed
max_lines = 500                                # Max lines changed
require_issue = true                           # Require issue reference
issue_keywords = ["Closes", "Fixes", "Resolves"]  # Keywords that link issues
```

### Ticket References: `[process.tickets]`

Require ticket/issue references in branches or commits.

```toml
[process.tickets]
enabled = true
pattern = "^(ABC|XYZ)-[0-9]+"                  # Regex for ticket IDs
require_in_commits = true                       # Require in commit messages
require_in_branch = true                        # Require in branch name
```

### Coverage: `[process.coverage]`

Enforce test coverage thresholds.

```toml
[process.coverage]
enabled = true
min_threshold = 80                             # Minimum coverage percentage
enforce_in = "config"                          # "ci", "config", or "both"
ci_workflow = "ci.yml"                         # Workflow to check (if enforce_in includes "ci")
ci_job = "test"                                # Job to check
```

### Repository Settings: `[process.repo]`

Configure GitHub repository rulesets and settings.

```toml
[process.repo]
enabled = true
require_branch_protection = true               # Verify branch protection exists
require_codeowners = true                      # Verify CODEOWNERS exists

[process.repo.ruleset]
name = "Branch Protection"                     # Ruleset name in GitHub
branch = "main"                                # Target branch
enforcement = "active"                         # "active", "evaluate", or "disabled"
required_reviews = 1                           # Minimum approving reviews
dismiss_stale_reviews = true                   # Dismiss approvals on new commits
require_code_owner_reviews = true              # Require CODEOWNER review
require_status_checks = ["test", "lint"]       # Required CI checks
require_branches_up_to_date = true             # Require branch is current
require_signed_commits = false                 # Require signed commits
enforce_admins = false                         # Apply to admins (no bypass)

# Actors that can bypass rules
[[process.repo.ruleset.bypass_actors]]
actor_type = "RepositoryRole"                  # Team, Integration, OrganizationAdmin, etc.
actor_id = 5                                   # Role ID (5 = admin)
bypass_mode = "pull_request"                   # "always" or "pull_request"

[process.repo.tag_protection]
patterns = ["v*"]                              # Tag patterns to protect
prevent_deletion = true                        # Prevent tag deletion
prevent_update = true                          # Prevent tag force-push
```

### CODEOWNERS: `[process.codeowners]`

Validate CODEOWNERS file contains required rules.

```toml
[process.codeowners]
enabled = true

[[process.codeowners.rules]]
pattern = "/check.toml"
owners = ["@platform-team"]

[[process.codeowners.rules]]
pattern = "*.ts"
owners = ["@frontend-team", "@backend-team"]
```

### Documentation: `[process.docs]`

Enforce documentation standards and governance.

```toml
[process.docs]
enabled = true
path = "docs/"                                 # Documentation directory
enforcement = "warn"                           # "block" or "warn"
allowlist = ["README.md", "CHANGELOG.md", "CLAUDE.md"]  # Markdown allowed outside docs/
max_files = 100                                # Max markdown files in docs/
max_file_lines = 500                           # Max lines per file
max_total_kb = 1024                            # Max total docs size
staleness_days = 30                            # Days before doc is stale
require_docs_in_pr = false                     # Require docs when changing tracked files
min_coverage = 80                              # Minimum API doc coverage
coverage_paths = ["src/**/*.ts"]               # Source files to check coverage
exclude_patterns = ["**/*.test.ts"]            # Exclude from coverage

[process.docs.types.api]
required_sections = ["Overview", "Parameters", "Returns", "Examples"]
frontmatter = ["title", "description"]

[process.docs.types.guide]
required_sections = ["Overview", "Prerequisites", "Steps"]
```

### Forbidden Files: `[process.forbidden_files]`

Ensure certain files do not exist in the repository.

```toml
[process.forbidden_files]
enabled = true
files = ["**/.env", "**/.env.*", "**/credentials.json", "**/*.pem"]
ignore = ["**/fixtures/**", "**/test-data/**"]  # Directories to skip
message = "Use AWS Secrets Manager for secrets"
```

Default ignore patterns: `**/node_modules/**`, `**/.git/**`

### Backups: `[process.backups]`

Verify S3 backups exist and are recent.

```toml
[process.backups]
enabled = true
bucket = "my-backups-bucket"                   # S3 bucket name
prefix = "db-backups/"                         # S3 key prefix
max_age_hours = 24                             # Max age of most recent backup
region = "us-east-1"                           # AWS region
```

---

## Exit Codes

| Code | Meaning             |
| ---- | ------------------- |
| 0    | All checks passed   |
| 1    | Violations found    |
| 2    | Configuration error |
| 3    | Runtime error       |

---

## Programmatic API

```typescript
import { runProcessChecks, auditProcessConfig, validateProcess } from "check-my-toolkit";

// Run all process checks
const result = await runProcessChecks(projectPath, config);

// Audit config only
const auditResult = await auditProcessConfig(projectPath, config);

// Validate remote repository (cm process scan --repo equivalent)
const scanResult = await validateProcess({
  repo: "owner/repo",
  config: "./check.toml", // optional
});
console.log(scanResult.summary); // { totalChecks, passedChecks, failedChecks, totalViolations, exitCode }
```

---

## Git Hook Integration

### Setup with Husky

```bash
# .husky/pre-commit
lint-staged

# .husky/pre-push
cm process check-branch

# .husky/commit-msg
cm process check-commit "$1"
```

### check.toml for hooks

```toml
[process.hooks]
enabled = true
require_husky = true
require_hooks = ["pre-commit", "pre-push", "commit-msg"]
protected_branches = ["main"]

[process.hooks.commands]
pre-push = ["cm process check-branch"]
commit-msg = ["cm process check-commit"]

[process.branches]
enabled = true
pattern = "^(feature|fix|hotfix|docs)/v[0-9]+\\.[0-9]+\\.[0-9]+/[0-9]+/[a-z0-9-]+$"
exclude = ["main", "master"]

[process.commits]
enabled = true
types = ["feat", "fix", "docs", "chore", "refactor", "test", "ci", "style", "perf"]
max_subject_length = 72
```

# PROCESS Domain Roadmap

Workflow and policy enforcement for git hooks, CI/CD, PRs, branches, repository settings, and backups.

## Overview

The PROCESS domain validates development workflow compliance.

```toml
[process]
├── [process.hooks]      # Git hooks (husky) ✅
├── [process.ci]         # CI/CD workflows ✅
├── [process.branches]   # Naming patterns ✅
├── [process.commits]    # Commit message format ✅
├── [process.changesets] # Changeset validation ✅
├── [process.pr]         # Size limits ✅
├── [process.tickets]    # Linear/Jira references ✅
├── [process.coverage]   # Coverage enforcement ✅
├── [process.repo]       # Branch protection ✅
├── [process.codeowners] # CODEOWNERS validation ✅
└── [process.backups]    # S3 backup verification ✅
```

---

## Implemented Features

### `[process.hooks]` ✅
Verify Husky git hooks are installed and configured.

### `[process.ci]` ✅
Verify GitHub workflows exist with required jobs and actions.

### `[process.branches]` ✅
Enforce branch naming conventions via regex patterns.

```toml
[process.branches]
enabled = true
pattern = "^(feature|fix|hotfix)/v[0-9]+\\.[0-9]+\\.[0-9]+/.+"
exclude = ["main", "master", "develop"]
```

### `[process.commits]` ✅
Enforce commit message format (conventional commits or custom patterns).

```toml
[process.commits]
enabled = true
types = ["feat", "fix", "docs", "style", "refactor", "test", "chore"]
require_scope = false
max_subject_length = 72

# Or use a custom pattern instead of types:
# pattern = "^[A-Z]+-[0-9]+: .+"
```

**Git hook command:** `cm process check-commit .git/COMMIT_EDITMSG`

### `[process.changesets]` ✅
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

**Checks:**
- Frontmatter format is valid
- Package names exist in workspace
- Bump types are allowed
- Description meets requirements

### `[process.pr]` ✅
Enforce PR size limits (files and lines changed).

### `[process.tickets]` ✅
Require ticket references (Linear, Jira) in PRs.

### `[process.coverage]` ✅
Verify coverage thresholds are configured.

### `[process.repo]` ✅
Verify branch protection is configured via GitHub API.

```toml
[process.repo]
enabled = true
require_branch_protection = true

[process.repo.branch_protection]
branch = "main"
required_reviews = 1
dismiss_stale_reviews = true
require_code_owner_reviews = true
require_status_checks = ["ci"]
require_branches_up_to_date = true
enforce_admins = true
```

### `[process.codeowners]` ✅
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

**Checks:**
- CODEOWNERS file exists (`.github/CODEOWNERS`, `CODEOWNERS`, or `docs/CODEOWNERS`)
- All configured rules exist with exact owner match
- Reports rules in CODEOWNERS not defined in config

### `cm process sync` ✅
Sync branch protection settings from check.toml to GitHub.

```bash
cm process diff   # Show what would change
cm process sync --apply  # Apply changes
```

### `[process.backups]` ✅
Verify repository backups exist in S3 and are recent.

```toml
[process.backups]
enabled = true
bucket = "my-org-backups"
prefix = "github/myorg/myrepo"  # S3 key prefix
max_age_hours = 24
```

### Checks

| Check | Description |
|-------|-------------|
| Backup exists | Files exist at S3 location |
| Backup recency | Most recent file is within max_age_hours |

### Output

```
[process.backups]
  ✓ Backup found: s3://my-org-backups/github/myorg/myrepo/2024-01-15.tar.gz
  ✓ Backup age: 6 hours (max: 24 hours)

process: passed
```

### Implementation

Uses AWS S3 SDK:

```typescript
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const client = new S3Client({ region });
const response = await client.send(new ListObjectsV2Command({
  Bucket: bucket,
  Prefix: prefix,
}));
// Check most recent object's LastModified
```

### AWS Permissions Required

```json
{
  "Effect": "Allow",
  "Action": ["s3:ListBucket"],
  "Resource": "arn:aws:s3:::my-org-backups"
}
```

### Testing

- **Unit tests**: `@aws-sdk/client-mock` to mock S3 responses
- **E2E tests**: LocalStack (Docker) with real S3 operations

```typescript
// Unit test example
import { mockClient } from "@aws-sdk/client-mock";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const mock = mockClient(S3Client);
mock.on(ListObjectsV2Command).resolves({
  Contents: [{ Key: "backup.tar.gz", LastModified: new Date() }]
});
```

---

## Implementation Status

| Feature | Status |
|---------|--------|
| `[process.hooks]` | ✅ Done |
| `[process.ci]` | ✅ Done |
| `[process.branches]` | ✅ Done |
| `[process.commits]` | ✅ Done |
| `[process.changesets]` | ✅ Done |
| `[process.pr]` | ✅ Done |
| `[process.tickets]` | ✅ Done |
| `[process.coverage]` | ✅ Done |
| `[process.repo]` | ✅ Done |
| `[process.codeowners]` | ✅ Done |
| `cm process sync` | ✅ Done |
| `[process.backups]` | ✅ Done |

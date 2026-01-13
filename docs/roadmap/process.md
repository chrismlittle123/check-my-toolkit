# PROCESS Domain Roadmap

Workflow and policy enforcement for git hooks, CI/CD, PRs, branches, repository settings, and backups.

## Overview

The PROCESS domain validates development workflow compliance.

```toml
[process]
├── [process.hooks]     # Git hooks (husky) ✅
├── [process.ci]        # CI/CD workflows ✅
├── [process.branches]  # Naming patterns ✅
├── [process.pr]        # Size limits ✅
├── [process.tickets]   # Linear/Jira references ✅
├── [process.coverage]  # Coverage enforcement ✅
├── [process.repo]      # Branch protection, CODEOWNERS ✅
└── [process.backups]   # S3 backup verification ✅
```

---

## Implemented Features

### `[process.hooks]` ✅
Verify Husky git hooks are installed and configured.

### `[process.ci]` ✅
Verify GitHub workflows exist with required jobs and actions.

### `[process.branches]` ✅
Enforce branch naming conventions via regex patterns.

### `[process.pr]` ✅
Enforce PR size limits (files and lines changed).

### `[process.tickets]` ✅
Require ticket references (Linear, Jira) in PRs.

### `[process.coverage]` ✅
Verify coverage thresholds are configured.

### `[process.repo]` ✅
Verify CODEOWNERS exists and branch protection is configured.

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
| `[process.pr]` | ✅ Done |
| `[process.tickets]` | ✅ Done |
| `[process.coverage]` | ✅ Done |
| `[process.repo]` | ✅ Done |
| `cm process sync` | ✅ Done |
| `[process.backups]` | ✅ Done |

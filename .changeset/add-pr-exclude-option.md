---
"check-my-toolkit": minor
---

feat(process): add exclude option for PR size limits

Added `exclude` option to `[process.pr]` configuration to exclude files from PR size calculations. This is useful for excluding auto-generated files like lock files and snapshots.

```toml
[process.pr]
enabled = true
max_files = 20
max_lines = 500
exclude = ["*-lock.json", "*-lock.yaml", "**/*.snap"]
```

When exclude patterns are configured, the tool fetches the PR file list from GitHub API and filters out matching files before calculating counts. Falls back to aggregate counts if the API is unavailable.

Closes #188

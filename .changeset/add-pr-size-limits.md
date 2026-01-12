---
"check-my-toolkit": minor
---

Add process.pr feature for PR size validation

- New `[process.pr]` configuration to enforce PR size limits
- `max_files`: Maximum number of files changed in a PR
- `max_lines`: Maximum total lines changed (additions + deletions)
- Reads PR data from `GITHUB_EVENT_PATH` environment variable (GitHub Actions context)
- Skips gracefully when not in a PR context
- Includes 23 unit tests and 5 e2e tests with mock event payloads

---
"check-my-toolkit": minor
---

Add protected branch push prevention hook validation

- Add `protected_branches` config option to `process.hooks` section
- Validates that pre-push hook exists when protected branches are configured
- Verifies hook contains branch detection logic (git rev-parse, git branch --show-current, etc.)
- Verifies hook checks for each configured protected branch name
- Works for both single repos and monorepos

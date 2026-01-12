---
"check-my-toolkit": minor
---

Add process.tickets feature for commit message ticket reference validation

- Validates commit messages contain ticket references matching a pattern
- Optionally validates branch names contain ticket references
- Configuration: `[process.tickets]` with `pattern`, `require_in_commits`, `require_in_branch`

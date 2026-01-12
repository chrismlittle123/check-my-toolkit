---
"check-my-toolkit": minor
---

Add process.branches validation for branch naming conventions

- Validate current branch name against a regex pattern
- Support exclude list for branches like main/master/develop
- Uses git CLI for universal compatibility (works with any git host)

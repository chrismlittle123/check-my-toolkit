---
"check-my-toolkit": minor
---

Add hook-specific commands for git workflow validation

- `cm process check-branch` - Validates current branch name against configured pattern (for pre-push hooks)
- `cm process check-commit <file>` - Validates commit message format and ticket references (for commit-msg hooks)

Both commands support `--quiet` mode for minimal output in hooks and use the same configuration from check.toml, enabling defense-in-depth with identical rules enforced locally and in CI.

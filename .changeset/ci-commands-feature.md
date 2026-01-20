---
"check-my-toolkit": minor
---

Add `[process.ci.commands]` configuration to enforce that specific shell commands run unconditionally in CI workflows on PRs to main.

Features:

- Workflow-level commands: require commands anywhere in workflow
- Job-level commands: require commands in specific jobs
- Validates workflow triggers on pull_request/push to main
- Detects conditional execution (job/step `if:` conditions)
- Detects commented-out commands
- Substring matching for flexible command detection

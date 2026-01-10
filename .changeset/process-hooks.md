---
"check-my-toolkit": minor
---

feat: add process domain with git hooks validation

Introduces the PROCESS domain for workflow enforcement, starting with git hooks validation:

**New Features:**
- `cm process check` - Run workflow validation (hooks, CI, etc.)
- `cm process audit` - Verify workflow configs exist
- `cm check` now runs both CODE and PROCESS domains

**Git Hooks Configuration (`[process.hooks]`):**
- `require_husky` - Verify .husky/ directory exists
- `require_hooks` - List of required hook files (e.g., pre-commit, pre-push)
- `commands` - Verify hooks contain specific commands

**Example Configuration:**
```toml
[process.hooks]
enabled = true
require_husky = true
require_hooks = ["pre-commit", "pre-push"]

[process.hooks.commands]
pre-commit = ["lint-staged"]
pre-push = ["npm test"]
```

**Violations Detected:**
- Missing husky installation
- Missing required hook files
- Hook files missing required commands

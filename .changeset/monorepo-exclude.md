---
"check-my-toolkit": minor
---

Add monorepo exclude patterns config

Added `[monorepo]` config section with `exclude` patterns to filter out directories from project detection. This allows excluding test fixtures and other directories that should not be treated as real projects.

Example:
```toml
[monorepo]
exclude = ["tests/e2e/projects/**"]
```


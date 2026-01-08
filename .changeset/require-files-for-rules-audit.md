---
"check-my-toolkit": minor
---

Require `files` config for ESLint rules audit

**BREAKING:** When using `rules` in ESLint config, you must now specify `files` to tell the audit which files to check against.

Before:
```toml
[code.linting.eslint]
enabled = true
rules.no-unused-vars = "error"
# Would guess src/ paths
```

After:
```toml
[code.linting.eslint]
enabled = true
files = ["src/**/*.ts"]  # Required when using rules
rules.no-unused-vars = "error"
```

This removes the hard-coded `src/` path guessing and makes the configuration explicit. Projects must now specify their file patterns.

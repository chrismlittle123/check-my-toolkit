---
"check-my-toolkit": minor
---

feat: support TOML-friendly object format for ESLint rules with options

ESLint rules with options can now be specified using a TOML-compatible object format:

```toml
[code.linting.eslint.rules]
"complexity" = { severity = "error", max = 10 }
"max-lines" = { severity = "error", max = 300, skipBlankLines = true, skipComments = true }
"max-lines-per-function" = { severity = "error", max = 50 }
```

The audit command now verifies both rule severities AND options match between check.toml and eslint.config.js.

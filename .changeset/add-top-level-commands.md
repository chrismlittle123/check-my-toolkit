---
"check-my-toolkit": patch
---

Add top-level CLI commands and colored output

- Add `cm check` as alias for `cm code check` (runs all domain checks)
- Add `cm audit` as alias for `cm code audit` (verifies all configs exist)
- Add `cm init` to create check.toml with default configuration
- Add colored terminal output using chalk for better readability
- Add `cm validate` to validate check.toml configuration file

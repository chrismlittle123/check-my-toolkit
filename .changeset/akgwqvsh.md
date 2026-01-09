---
"check-my-toolkit": patch
---

fix: documentation and schema validation bugs

- **README.md**: Fixed incorrect config names in documentation
  - `[code.security.gitleaks]` → `[code.security.secrets]`
  - `[code.security.npm-audit]` → `[code.security.npmaudit]`
  - `[code.security.pip-audit]` → `[code.security.pipaudit]`
  - `cm validate` → `cm validate config`
  - Fixed naming conventions example to use correct `[[code.naming.rules]]` array syntax

- **Schema**: Changed `min_test_files` from `.positive()` to `.nonnegative()` to allow 0

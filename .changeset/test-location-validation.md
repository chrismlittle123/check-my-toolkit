---
"check-my-toolkit": minor
---

Add test location validation with `required_dir` option

- Add `required_dir` config option to `code.tests` section
- Validates that the required directory exists
- Scopes test file search to only the required directory
- Clear error messages when directory is missing or empty
- Works for both single repos and monorepos (per-package check.toml)

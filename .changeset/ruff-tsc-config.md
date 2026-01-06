---
"check-my-toolkit": patch
---

Add configuration support for Ruff and TSC from check.toml. Ruff now accepts line-length, lint.select, and lint.ignore options. TSC now accepts strict mode and other compiler flags. Removed ESLint rules from schema as ESLint flat config doesn't support CLI rule overrides.

---
"check-my-toolkit": patch
---

Remove array-format ESLint rule support from check.toml schema due to TOML limitation (arrays cannot mix strings and inline tables). Complex rules like `@typescript-eslint/naming-convention` must be configured directly in eslint.config.js.

---
"check-my-toolkit": patch
---

fix: handle ESLint rules with positional options in audit

Rules like `max-depth`, `max-params`, and `complexity` use positional options in ESLint's effective config format (e.g., `[2, 4]` instead of `[2, { max: 4 }]`). The audit now correctly handles this format when comparing the `max` option.

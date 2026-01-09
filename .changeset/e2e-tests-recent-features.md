---
"check-my-toolkit": patch
---

test: add e2e tests for recent features

Added e2e tests covering:
- ESLint rules with options (v0.15.0): Tests TOML object format for rules like `max-depth`, `max-params`, `complexity`
- ESLint positional options (v0.15.1): Tests that option values like `{ max = 4 }` match ESLint's positional format
- npm/pnpm audit (v0.17.0): Tests for npm audit pass, pnpm project detection, and no lock file error handling

Also fixed pnpm audit to properly skip when pnpm is not installed (ENOENT detection).

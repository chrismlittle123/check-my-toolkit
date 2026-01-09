---
"check-my-toolkit": minor
---

feat: add pnpm support for dependency audit

- Auto-detect package manager by checking for lock files (pnpm-lock.yaml, package-lock.json)
- Run appropriate audit command (`pnpm audit` or `npm audit`) based on detected package manager
- Parse both npm and pnpm audit output formats
- Updated error messages to reflect multi-package-manager support

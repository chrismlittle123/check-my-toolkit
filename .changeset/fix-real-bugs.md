---
"check-my-toolkit": patch
---

fix: resolve three real bugs

- Fix numeric filenames (e.g., 404.tsx, 500.tsx) failing naming validation - common for Next.js error pages
- Fix tsconfig.json with comments (JSONC) failing to parse during audit
- Fix gitleaks custom config files (.gitleaks.toml, gitleaks.toml) being ignored

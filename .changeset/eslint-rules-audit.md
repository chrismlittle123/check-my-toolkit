---
"check-my-toolkit": minor
---

Add ESLint rules audit to `cm code audit` command

- Added `rules` option to ESLint config in check.toml schema
- `cm code audit` now verifies that ESLint rules match the required rules from check.toml
- Uses `eslint --print-config` to get effective config and compare severities
- Registry maintainers can now enforce ESLint rule standards across projects

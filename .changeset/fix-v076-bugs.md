---
"check-my-toolkit": patch
---

Fix bugs reported in v0.7.5:

- Remove process and stack domains from schema (not implemented, were misleading)
- Fix ty audit false positive: now properly checks for [tool.ty] section in pyproject.toml instead of just checking if pyproject.toml exists
- Fix tests audit performance: use iterator with early termination to avoid scanning all files

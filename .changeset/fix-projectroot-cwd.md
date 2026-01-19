---
"check-my-toolkit": patch
---

Fix inconsistent projectRoot vs process.cwd() usage in PROCESS domain

- changesets.ts: Pass projectRoot to checkDirectoryExists() instead of using process.cwd()
- changesets.ts: Pass projectRoot to checkChangesRequireChangeset() instead of using process.cwd()
- check-branch.ts: Pass projectRoot to runBranchValidation() instead of using process.cwd()

These fixes ensure consistent behavior when running from subdirectories or in monorepos.

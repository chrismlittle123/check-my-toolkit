---
"check-my-toolkit": patch
---

Fix sync applier to always include `enforce_admins` field (required by GitHub API), defaulting to `false` so CI/release workflows can merge to protected branches.

---
"check-my-toolkit": minor
---

Add `[process.forbidden_files]` configuration to enforce that certain files must NOT exist in the repository. This is useful for detecting anti-patterns like `.env` files that should use secrets management instead.

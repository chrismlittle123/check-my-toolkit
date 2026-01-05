---
"check-my-toolkit": minor
---

Add Gitleaks integration for hardcoded secrets detection, completing v0.3 security features.

- New `[code.security.secrets]` configuration option
- Detects hardcoded secrets using Gitleaks
- Skips gracefully when Gitleaks is not installed
- Reports findings with file/line information

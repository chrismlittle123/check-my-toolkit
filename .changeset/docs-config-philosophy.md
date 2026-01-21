---
"check-my-toolkit": patch
---

docs: clarify check.toml configuration philosophy and Gitleaks custom rules

- Add "Configuration Philosophy" section explaining that check.toml is the source of truth for lint rules
- Add note to Ruff section clarifying that ruff.toml rules are not used by cm code check
- Update Gitleaks documentation with what is/isn't detected by default
- Add example for custom Gitleaks rules via .gitleaks.toml

Closes #130

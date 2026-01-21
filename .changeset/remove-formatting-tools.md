---
"check-my-toolkit": minor
---

Remove Prettier and Ruff Format from CODE domain

- Remove Prettier formatting check (`[code.formatting.prettier]`)
- Remove Ruff Format check (`format = true` in `[code.linting.ruff]`)
- CODE domain now has 12 tools (down from 14)

This is a breaking change for users who have these tools enabled in their `check.toml`. Remove any `[code.formatting.prettier]` sections and `format = true` from `[code.linting.ruff]` sections.

---
"check-my-toolkit": patch
---

fix: batch bug fixes for issues #113, #118, #119

- CODEOWNERS validation now enforces owner order (#113)
- CI action extraction properly handles Docker, local, and SHA references (#118)
- `cm validate config --verbose` now shows when project rules override registry rules (#119)

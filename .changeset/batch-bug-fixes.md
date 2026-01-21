---
"check-my-toolkit": patch
---

Fix multiple bugs:

- fix(config): reject naming rules with empty extensions array (#182)
- fix(cli): return exit code 2 for invalid --format argument (#179)
- fix(process): report error for non-existent workflow files in ci.commands (#177)
- fix(process): handle boolean `if: true` in CI workflow checks (#176)
- fix(process): use min_threshold from check.toml as valid coverage config (#187)

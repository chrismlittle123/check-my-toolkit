---
"check-my-toolkit": minor
---

Add `cm dependencies` command for drift-toolkit integration

- New CLI command: `cm dependencies` with `--format`, `--check`, `--project` options
- Built-in dependency mappings for 12 tools (eslint, prettier, tsc, knip, vitest, pytest, etc.)
- Support for custom dependencies via `dependencies = [...]` in check.toml tool configs
- Always tracked files: check.toml, .github/workflows/\*.yml, repo-metadata.yaml
- Programmatic API: `getDependencies()` exported for library use

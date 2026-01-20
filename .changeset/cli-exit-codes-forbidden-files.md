---
"check-my-toolkit": patch
---

Fix CLI exit codes and add configurable forbidden_files ignore patterns

- CLI now returns exit code 2 (CONFIG_ERROR) for invalid arguments like `-f invalid`
- Added `ignore` option to `[process.forbidden_files]` config to customize which directories to skip during scans (defaults to `node_modules/` and `.git/`)

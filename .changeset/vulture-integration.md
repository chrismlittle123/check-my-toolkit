---
"check-my-toolkit": patch
---

Add Vulture integration for Python dead code detection

- New `[code.unused.vulture]` configuration option
- Detects unused functions, classes, variables, imports, methods, attributes, and unreachable code
- Supports Vulture 2.9+ (uses exit code 3 for dead code found)
- Skips gracefully when Vulture is not installed

---
"check-my-toolkit": patch
---

Fix multiple bugs reported in v0.7.4:

- Fix VERSION constant to read dynamically from package.json instead of hardcoded value
- Update CLI description to accurately reflect current functionality (code quality only)
- Remove TSC compiler options from schema (cannot override tsconfig.json via CLI)
- Remove unimplemented code.complexity schema
- Remove unimplemented code.files schema
- Use Promise.allSettled for parallel tool execution to prevent one failing tool from losing all results

---
"check-my-toolkit": patch
---

Fix bugs in v0.8.0+ features:

- **Config Validation**: `cm validate config` now validates extends registry paths and ruleset references exist
- **Skip Messages**: Improved clarity by showing actual missing file names (e.g., "package-lock.json not found" instead of "No npmaudit config found")

---
"check-my-toolkit": patch
---

Fix duplicate extension validation and block comment detection

- Add schema validation to reject duplicate extensions across naming rules (#140)
- Detect disable patterns in block comments (`/* */`) in addition to line comments (#138)

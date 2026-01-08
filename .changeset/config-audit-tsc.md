---
"check-my-toolkit": minor
---

Add config value auditing for tsconfig.json

**Config Audit (`cm code audit`):**

- Audit tsconfig.json compiler options against expected values from check.toml
- Support `[code.types.tsc.require]` section to specify required compiler options
- Reports violations with "expected X, got Y" messages for mismatched values
- Reports "expected X, got missing" for options that aren't set

Example check.toml:
```toml
[code.types.tsc]
enabled = true

[code.types.tsc.require]
strict = true
noImplicitAny = true
esModuleInterop = true
```

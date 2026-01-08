---
"check-my-toolkit": minor
---

Add registry validation and extends functionality

**Registry Validation (`cm validate registry`):**
- Validates registry structure with `rulesets/*.toml` and `prompts/*.md`
- Checks all TOML files conform to check.toml schema
- Checks all prompt files have `.md` extension

**Registry Extends (`[extends]` in check.toml):**
- Extend configuration from remote registries
- Support GitHub (`github:owner/repo` or `github:owner/repo@ref`) and local paths
- Merge multiple rulesets in order with local overrides
- Cache GitHub repositories in `/tmp/cm-registry-cache/`

**Command changes:**
- `cm validate` → `cm validate config` (validate check.toml)
- `cm validate registry` (new - validate registry structure)

Example check.toml with extends:
```toml
[extends]
registry = "github:chrismlittle123/check-my-toolkit-registry-community"
rulesets = ["typescript-internal"]

[code.linting.eslint]
enabled = true
```

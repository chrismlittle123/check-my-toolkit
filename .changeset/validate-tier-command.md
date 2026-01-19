---
"check-my-toolkit": minor
---

Add `cm validate tier` command for validating tier-ruleset alignment

- Validates that check.toml rulesets match the project tier from repo-metadata.yaml
- Production tier requires `*-production` ruleset, internal requires `*-internal`, prototype requires `*-prototype`
- Defaults to internal tier when repo-metadata.yaml is missing
- Supports `--format json` for programmatic use
- Exports `validateTierRuleset()` API for library consumers

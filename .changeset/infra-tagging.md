---
"check-my-toolkit": minor
---

Add infra.tagging for AWS resource tag validation

New INFRA domain with AWS resource tagging enforcement:
- Uses AWS Resource Groups Tagging API to verify resources have required tags
- Supports allowed values validation for specific tags
- New CLI commands: `cm infra check` and `cm infra audit`
- Configurable region and tag requirements in check.toml

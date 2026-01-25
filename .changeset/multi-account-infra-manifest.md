---
"check-my-toolkit": minor
---

Add multi-account infrastructure manifest support

- New manifest v2 format with resources grouped by cloud account (AWS accounts and GCP projects)
- Account keys in format `aws:<account-id>` or `gcp:<project-id>` with optional aliases
- Backward compatible with v1 flat format
- New CLI options:
  - `cm infra scan --account <name>` - Filter scan to specific account
  - `cm infra generate --account <alias>` - Set account alias
  - `cm infra generate --account-id <id>` - Set explicit account ID
  - `cm infra generate --merge` - Merge into existing manifest

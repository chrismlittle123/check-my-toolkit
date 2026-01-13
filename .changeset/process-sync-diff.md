---
"check-my-toolkit": minor
---

Add `cm process diff` and `cm process sync` commands for GitHub branch protection synchronization

- `cm process diff` shows differences between current GitHub settings and check.toml config
- `cm process sync` previews changes (requires `--apply` flag to actually apply)
- Supports configuring: required_reviews, dismiss_stale_reviews, require_code_owner_reviews, require_status_checks, require_branches_up_to_date, require_signed_commits, enforce_admins

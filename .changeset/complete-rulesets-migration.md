---
"check-my-toolkit": minor
---

Complete GitHub Rulesets migration (Issue #163)

**New Features:**
- Rename config from `[process.repo.branch_protection]` to `[process.repo.ruleset]`
- Add `name` and `enforcement` fields to ruleset configuration
- Add bypass actor validation with `--validate-actors` flag
- Add cleanup commands: `cm process list-rules` and `cm process cleanup-rules`

**Migration:**
- `[process.repo.branch_protection]` is now deprecated (still works in v1.x)
- Use `[process.repo.ruleset]` instead
- See `docs/MIGRATION.md` for migration guide

**New CLI Commands:**
- `cm process list-rules` - List all protection rules (classic + rulesets)
- `cm process cleanup-rules [--apply]` - Remove orphaned classic branch protection
- `cm process sync --validate-actors` - Validate bypass actors before applying

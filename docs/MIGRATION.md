# Migration Guides

## Migrating from `branch_protection` to `ruleset` (v1.7.0)

### What Changed

The configuration section `[process.repo.branch_protection]` has been renamed to `[process.repo.ruleset]`. This change reflects that the tool now uses the GitHub Rulesets API instead of the classic branch protection API.

### Why

GitHub Rulesets provide several advantages over classic branch protection:

- **Bypass actors**: Allow specific apps (like GitHub Actions) or roles to bypass rules
- **Fine-grained control**: More flexible rule configuration
- **Better automation support**: Release workflows can push directly to main while still enforcing rules for humans
- **Evaluate mode**: Test rules without enforcing them

### Step-by-Step Migration

#### 1. Update your check.toml

**Before (deprecated, still works in v1.x):**
```toml
[process.repo.branch_protection]
branch = "main"
required_reviews = 1
dismiss_stale_reviews = true
require_code_owner_reviews = true
require_status_checks = ["ci"]
require_branches_up_to_date = true
enforce_admins = true
```

**After (recommended):**
```toml
[process.repo.ruleset]
name = "main-protection"          # NEW: optional ruleset name
branch = "main"
enforcement = "active"            # NEW: active, evaluate, or disabled
required_reviews = 1
dismiss_stale_reviews = true
require_code_owner_reviews = true
require_status_checks = ["ci"]
require_branches_up_to_date = true
enforce_admins = true

# NEW: bypass actors (optional)
[[process.repo.ruleset.bypass_actors]]
actor_type = "RepositoryRole"
actor_id = 5                      # Admin role
bypass_mode = "always"
```

#### 2. Test your configuration

```bash
# Preview what will change
cm process diff

# Validate bypass actors (if using them)
cm process sync --validate-actors
```

#### 3. Apply changes (optional)

If you want to update your GitHub ruleset to match the new config:

```bash
cm process sync --apply
```

### New Properties

| Property      | Description                        | Default               |
| ------------- | ---------------------------------- | --------------------- |
| `name`        | Ruleset name in GitHub             | "Branch Protection"   |
| `enforcement` | Ruleset enforcement level          | "active"              |
| `bypass_actors` | Actors that can bypass rules     | (none)                |

### Bypass Actor Types

| Type                | Description                                | actor_id  |
| ------------------- | ------------------------------------------ | --------- |
| `RepositoryRole`    | 1=Read, 2=Triage, 3=Write, 4=Maintain, 5=Admin | Required |
| `OrganizationAdmin` | Organization administrator                 | Not needed |
| `Team`              | GitHub team (use numeric team ID)          | Required  |
| `Integration`       | GitHub App installation ID                 | Required  |
| `DeployKey`         | Deploy key ID                              | Required  |

### Cleaning Up Classic Branch Protection

If you previously used classic branch protection (the old GitHub API), you may have orphaned rules. Use the cleanup commands to migrate:

```bash
# List all protection rules (both classic and rulesets)
cm process list-rules

# Preview what would be removed
cm process cleanup-rules

# Actually remove orphaned classic rules
cm process cleanup-rules --apply
```

### Troubleshooting

#### "No [process.repo.ruleset] configured" error

You're using an old config with `[process.repo.branch_protection]`. Either:
1. Rename the section to `[process.repo.ruleset]`, or
2. Wait for the deprecation period (v1.x still supports the old name)

#### Bypass actor validation fails

Run with `--validate-actors` to check your actor IDs:

```bash
cm process sync --validate-actors
```

Common issues:
- **RepositoryRole**: ID must be 1-5 (1=Read, 2=Triage, 3=Write, 4=Maintain, 5=Admin)
- **Team**: Use the numeric team ID, not the team slug
- **Integration**: Use the GitHub App installation ID for your organization

#### Classic rules still exist after migration

Use the cleanup commands:

```bash
cm process list-rules        # See what exists
cm process cleanup-rules --apply  # Remove orphaned classic rules
```

### Deprecation Timeline

- **v1.7.0**: Both names work, deprecation warning shown for `branch_protection`
- **v2.0.0**: `branch_protection` support will be removed

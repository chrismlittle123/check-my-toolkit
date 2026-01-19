# CODE Domain Roadmap

Dependency tracking, project detection, and tier validation for drift-toolkit integration.

## Overview

The CODE domain provides tooling for dependency tracking and project management that enables drift-toolkit to perform scheduled code scans.

```toml
[code]
├── dependencies      # Track config files per check
├── projects detect   # Discover projects in monorepos
└── validate tier     # Tier-to-ruleset alignment
```

---

## `cm dependencies` Command

**Purpose:** Returns the list of files that drift-toolkit should track for changes. Each check in check.toml has associated configuration files that, if changed, indicate potential drift.

**Priority:** High (blocker for `drift code scan`)

### CLI Interface

```bash
# Get all dependencies for current project
cm dependencies

# Get dependencies as JSON (for programmatic use)
cm dependencies --json

# Get dependencies for a specific check
cm dependencies --check eslint

# Get dependencies for a specific project in monorepo
cm dependencies --project packages/api
```

### Output Format

**Human-readable:**

```
Dependencies for check.toml

eslint:
  - .eslintrc.js
  - .eslintignore
  - eslint.config.js

prettier:
  - .prettierrc
  - .prettierignore

typescript:
  - tsconfig.json
  - tsconfig.build.json

knip:
  - knip.json

Always tracked:
  - check.toml
  - .github/workflows/*.yml
```

**JSON output (`--json`):**

```json
{
  "project": ".",
  "checkTomlPath": "./check.toml",
  "dependencies": {
    "eslint": [".eslintrc.js", ".eslintignore", "eslint.config.js"],
    "prettier": [".prettierrc", ".prettierignore"],
    "typescript": ["tsconfig.json", "tsconfig.build.json"],
    "knip": ["knip.json"]
  },
  "alwaysTracked": ["check.toml", ".github/workflows/*.yml"],
  "allFiles": [
    "check.toml",
    ".eslintrc.js",
    ".eslintignore",
    "eslint.config.js",
    ".prettierrc",
    ".prettierignore",
    "tsconfig.json",
    "tsconfig.build.json",
    "knip.json",
    ".github/workflows/*.yml"
  ]
}
```

### Configuration

Custom dependencies can be specified in check.toml:

```toml
[eslint]
enabled = true
dependencies = [".eslintrc.js", ".eslintignore", "eslint.config.js"]

[custom-tool]
enabled = true
dependencies = ["custom-tool.config.yaml", "custom-tool.rules.json"]
```

### Built-in Dependency Mappings

| Check      | Default Dependencies                              |
| ---------- | ------------------------------------------------- |
| eslint     | `.eslintrc.*`, `eslint.config.*`, `.eslintignore` |
| prettier   | `.prettierrc*`, `.prettierignore`                 |
| typescript | `tsconfig*.json`                                  |
| knip       | `knip.json`, `knip.config.ts`                     |
| vitest     | `vitest.config.*`                                 |
| pytest     | `pytest.ini`, `pyproject.toml`, `conftest.py`     |

### Always Tracked (Hardcoded)

- `check.toml` (all of them in monorepos)
- `.github/workflows/*.yml`
- `repo-metadata.yaml`

### Programmatic API

```typescript
import { getDependencies } from "check-my-toolkit";

const result = await getDependencies({
  projectPath: ".",
  check: "eslint", // optional, filter to specific check
});

// result.dependencies: Record<string, string[]>
// result.alwaysTracked: string[]
// result.allFiles: string[]
```

---

## `cm projects detect` Command

**Purpose:** Discover all projects in a monorepo, show which have/don't have check.toml, and optionally create missing configs.

### CLI Interface

```bash
# Discover all projects
cm projects detect

# Show check.toml and tier status
cm projects detect --show-status

# Filter to projects without check.toml
cm projects detect --missing-config

# Create missing check.toml files
cm projects detect --fix

# Create with shared registry
cm projects detect --fix --registry .cm

# Output as JSON
cm projects detect --json

# Dry run
cm projects detect --fix --dry-run
```

### Output Format

**Human-readable:**

```
Detected 4 projects:

  PATH                    TYPE          STATUS
  apps/web                typescript    ✓ has check.toml
  apps/api                typescript    ✓ has check.toml
  lambdas/processor       python        ✗ missing check.toml
  lambdas/notifier        python        ✗ missing check.toml

2 projects missing check.toml. Run 'cm projects detect --fix' to create them.
```

**Enhanced JSON output (`--json --show-status`):**

```json
{
  "projects": [
    {
      "path": "packages/api",
      "name": "api",
      "type": "typescript",
      "hasCheckToml": true,
      "tier": "production",
      "status": "active"
    },
    {
      "path": "packages/utils",
      "name": "utils",
      "type": "python",
      "hasCheckToml": false,
      "tier": null,
      "status": null
    }
  ],
  "summary": {
    "total": 2,
    "withConfig": 1,
    "withoutConfig": 1
  }
}
```

### Project Detection Rules

| Marker File      | Project Type                                  |
| ---------------- | --------------------------------------------- |
| `package.json`   | typescript (skip if has `"workspaces"` field) |
| `pyproject.toml` | python                                        |

### Skipped Directories

- `node_modules/`
- `.git/`
- `venv/`, `.venv/`
- `__pycache__/`
- `dist/`, `build/`

---

## `cm validate tier` Command

**Purpose:** Verify that a project's check.toml extends from rulesets appropriate for its tier (production, internal, prototype).

### CLI Interface

```bash
# Validate tier-ruleset alignment
cm validate tier

# JSON output
cm validate tier --json
```

### Validation Logic

**repo-metadata.yaml:**

```yaml
tier: production
status: active
```

**check.toml:**

```toml
[extends]
registry = "github:myorg/standards"
rulesets = ["typescript-production"]
```

**Rules:**

1. If `tier: production` → rulesets must include a `*-production` ruleset
2. If `tier: internal` → rulesets must include a `*-internal` ruleset
3. If `tier: prototype` → rulesets must include a `*-prototype` ruleset
4. Overrides are allowed, but base ruleset must match tier
5. If no tier specified, default to `internal`

### Output Format

**Success:**

```
Tier-Ruleset Validation
=======================

Tier: production (from repo-metadata.yaml)
Rulesets: ["typescript-production", "custom-overrides"]

✓ Tier-ruleset alignment valid
  Base ruleset: typescript-production
  Tier requirement: *-production
```

**Failure:**

```
Tier-Ruleset Validation
=======================

Tier: production (from repo-metadata.yaml)
Rulesets: ["typescript-internal"]

✗ Tier-ruleset mismatch
  Expected: ruleset matching *-production
  Actual: typescript-internal
  Action: Update check.toml to extend from typescript-production
```

**JSON output:**

```json
{
  "valid": false,
  "tier": "production",
  "rulesets": ["typescript-internal"],
  "expectedPattern": "*-production",
  "matchingRuleset": null,
  "error": "Tier-ruleset mismatch: production tier requires *-production ruleset"
}
```

### Programmatic API

```typescript
import { validateTierRuleset } from "check-my-toolkit";

const result = await validateTierRuleset({
  projectPath: ".",
});

// result.valid: boolean
// result.tier: string
// result.rulesets: string[]
// result.matchingRuleset: string | null
```

---

## Implementation Priority

| Phase | Feature                         | Enables               |
| ----- | ------------------------------- | --------------------- |
| 1     | `dependencies` command          | `drift code scan`     |
| 1     | `projects detect` enhancemenets | `drift code scan`     |
| 2     | `validate tier` command         | Standards enforcement |

---

## Implementation Status

| Feature                               | Status     |
| ------------------------------------- | ---------- |
| `cm dependencies`                     | 📋 Planned |
| `cm projects detect`                  | ✅ Done    |
| `cm projects detect --show-status`    | 📋 Planned |
| `cm projects detect --missing-config` | 📋 Planned |
| `cm validate tier`                    | 📋 Planned |

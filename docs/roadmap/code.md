# CODE Domain Roadmap

Static analysis, security, and code quality enforcement.

## Overview

The CODE domain validates source code quality through linting, type checking, formatting, and security scanning. It wraps existing tools (ESLint, Ruff, tsc) and provides unified configuration via `check.toml`.

The key value proposition: **enforce organizational standards** by extending from a registry and validating that project configs conform.

```
Registry (org standards) → check.toml [extends] → validates project configs
```

```toml
[code]
├── [code.linting]      # ESLint, Ruff
├── [code.formatting]   # Prettier, Ruff (format)
├── [code.types]        # tsc, ty
├── [code.unused]       # Knip, Vulture
├── [code.tests]        # Test file validation
└── [code.security]     # Secrets, SAST, dependency audits
```

---

## v0.1 — MVP (v0.1.0)

First release focuses on CODE domain fundamentals.

### Linting: `[code.linting]`

| Check | Description | Tool |
|-------|-------------|------|
| ESLint | JavaScript/TypeScript linting | ESLint |
| Ruff | Python linting | Ruff |

```toml
[code.linting.eslint]
enabled = true

[code.linting.ruff]
enabled = true
```

### Type Checking: `[code.types]`

| Check | Description | Tool |
|-------|-------------|------|
| tsc | TypeScript type checking | tsc |

```toml
[code.types.tsc]
enabled = true
```

### Commands

| Command | Description |
|---------|-------------|
| `cm code check` | Run all enabled checks |
| `cm code audit` | Verify tool configs exist |
| `cm validate config` | Validate check.toml syntax and schema |

---

## v0.2 — Formatting & Structure (v0.2.0 - v0.5.0)

### Formatting: `[code.formatting]`

| Check | Description | Tool |
|-------|-------------|------|
| Prettier | JS/TS formatting | Prettier |
| Ruff Format | Python formatting | Ruff (`ruff format`) |

```toml
[code.formatting.prettier]
enabled = true

[code.linting.ruff]
enabled = true
format = true  # Also check formatting
```

### Tests: `[code.tests]`

| Check | Description |
|-------|-------------|
| Test files exist | Validates test files match pattern |

```toml
[code.tests]
enabled = true
pattern = "**/*.{test,spec}.{ts,tsx,js,jsx,py}"
min_test_files = 1
```

### Unused Code: `[code.unused]`

| Check | Description | Tool |
|-------|-------------|------|
| Knip | Unused exports, files, dependencies | Knip |
| Vulture | Python dead code detection | Vulture |

```toml
[code.unused.knip]
enabled = true

[code.unused.vulture]
enabled = true
```

### Type Checking: `[code.types]`

| Check | Description | Tool |
|-------|-------------|------|
| ty | Python type checking | ty (Astral) |

```toml
[code.types.ty]
enabled = true
```

---

## v0.3 — Security (v0.6.0 - v0.7.x)

### Security Scanning: `[code.security]`

| Check | Description | Tool |
|-------|-------------|------|
| Secrets | Hardcoded secrets detection | Gitleaks |
| Dependency audit (JS) | npm vulnerability scanning | npm-audit |
| Dependency audit (Python) | pip vulnerability scanning | pip-audit |

```toml
[code.security.secrets]
enabled = true

[code.security.npmaudit]
enabled = true

[code.security.pipaudit]
enabled = true
```

**Behavior:**
- Skip tool if not installed (warn, don't fail)
- Report vulnerabilities in unified format
- Exit code 1 if vulnerabilities found

---

## v0.8 — Registry Validation

Validate that a repository conforms to registry structure.

### Registry Structure

A registry repository contains:
- `rulesets/*.toml` - Check.toml configuration files
- `prompts/*.md` - Markdown prompt files

### Commands

| Command | Description |
|---------|-------------|
| `cm validate registry` | Validate registry structure |

### Validation Rules

1. `rulesets/` directory must exist
2. All files in `rulesets/` must be valid `.toml` files conforming to check.toml schema
3. `prompts/` directory must exist
4. All files in `prompts/` must have `.md` extension

---

## v0.9 — Registry Extends

Central feature: inherit standards from organizational registries.

### Registry Format

A registry is a remote `check.toml` that defines organizational standards:

```toml
# github:myorg/standards/typescript.toml

[code.linting.eslint]
enabled = true

[code.types.tsc]
enabled = true

[code.formatting.prettier]
enabled = true

[code.unused.knip]
enabled = true
```

### Extending from Registry

Projects extend from one or more registries:

```toml
# project check.toml

[extends]
registry = "github:myorg/standards"
rulesets = ["base", "typescript"]

# Local overrides (additive only)
[code.tests]
enabled = true
min_test_files = 5
```

### Resolution

1. Fetch remote configs via git (uses ambient SSH credentials)
2. Merge configs in order: first ruleset → last ruleset → local
3. Local can only add, not remove inherited rules

### Commands

| Command | Description |
|---------|-------------|
| `cm code check` | Run checks (merges extended configs) |
| `cm code audit` | Audit configs (merges extended configs) |

---

## v1.0 — Config Audit

Verify that project tool configs conform to the standard.

### How It Works

The standard (from registry) says:
```toml
[code.types.tsc]
enabled = true
strict = true
noImplicitAny = true
```

`cm code audit` checks that `tsconfig.json` contains:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

### Output

```
$ cm code audit

[code.types.tsc]
  ✓ tsconfig.json exists
  ✗ strict: expected true, got false
  ✗ noImplicitAny: missing (expected true)

[code.linting.eslint]
  ✓ eslint.config.js exists
  ✓ all required rules present

audit: 2 issues found
```

### Commands

| Command | Description |
|---------|-------------|
| `cm code audit` | Verify tool configs match standard |
| `cm code audit --fix` | Show suggested fixes (does not modify files) |

---

## Future Considerations

### Deferred

| Feature | Reason |
|---------|--------|
| `cm code generate` | Users should write their own configs; audit tells them what's wrong |
| `[code.files]` | "Required files" is low value; "docs for every feature" is too fuzzy to verify |
| SAST (Semgrep) | Complex tool, may be out of scope |

### Potential

| Feature | Description |
|---------|-------------|
| `cm code fix` | Auto-fix violations where possible (eslint --fix, ruff --fix) |
| CI integration | GitHub Action, GitLab CI template |
| Caching | Cache registry fetches, tool results |

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
└── [code.security]     # Secrets, dependency audits
```

---

## Implemented Features

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
line-length = 100
lint.select = ["E", "F", "I"]
lint.ignore = ["E501"]
```

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

### Type Checking: `[code.types]`

| Check | Description | Tool |
|-------|-------------|------|
| tsc | TypeScript type checking | tsc |
| ty | Python type checking | ty (Astral) |

```toml
[code.types.tsc]
enabled = true

[code.types.tsc.require]
strict = true
noImplicitAny = true

[code.types.ty]
enabled = true
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

### Security: `[code.security]`

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

### Registry & Extends

Inherit standards from organizational registries:

```toml
[extends]
registry = "github:myorg/standards"
rulesets = ["base", "typescript"]

# Local overrides
[code.linting.eslint]
enabled = true
```

Registry structure:
- `rulesets/*.toml` - Check.toml configuration files
- `prompts/*.md` - Markdown prompt files

### Config Audit

Verify that project tool configs conform to the standard:

```toml
[code.types.tsc]
enabled = true

[code.types.tsc.require]
strict = true
noImplicitAny = true
```

`cm code audit` checks that `tsconfig.json` contains the required compiler options.

---

## Commands

| Command | Description |
|---------|-------------|
| `cm code check` | Run all enabled checks |
| `cm code audit` | Verify tool configs exist and match requirements |
| `cm validate config` | Validate check.toml syntax and schema |
| `cm validate registry` | Validate registry structure |

---

## Future Considerations

| Feature | Description |
|---------|-------------|
| `cm code fix` | Auto-fix violations where possible (eslint --fix, ruff --fix) |
| CI integration | GitHub Action, GitLab CI template |
| Caching | Cache registry fetches, tool results |

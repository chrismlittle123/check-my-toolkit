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
├── [code.security]     # Secrets, dependency audits
└── [code.naming]       # File and folder naming conventions
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

### Naming Conventions: `[code.naming]`

Enforce file and folder naming conventions based on file extensions.

| Case | Example |
|------|---------|
| `kebab-case` | `my-component.ts` |
| `snake_case` | `my_module.py` |
| `camelCase` | `myHelper.ts` |
| `PascalCase` | `MyComponent.tsx` |

```toml
[code.naming]
enabled = true

# TypeScript/JavaScript files and folders should be kebab-case
[[code.naming.rules]]
extensions = ["ts", "tsx", "js", "jsx"]
file_case = "kebab-case"
folder_case = "kebab-case"

# Python files and folders should be snake_case
[[code.naming.rules]]
extensions = ["py"]
file_case = "snake_case"
folder_case = "snake_case"
```

**How it works:**
- Files are validated against `file_case` based on their extension
- Folders containing files with matching extensions are validated against `folder_case`
- Common directories (`node_modules`, `.git`, `dist`, `__pycache__`) are automatically excluded

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

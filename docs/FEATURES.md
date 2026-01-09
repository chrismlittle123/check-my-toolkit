# Features - check-my-toolkit v0.18.0

Unified project health checks for code quality, process compliance, and stack validation.

## Overview

check-my-toolkit (`cm`) provides a single CLI to run multiple code quality tools with unified configuration via `check.toml`. Currently focused on the **CODE** domain with 14 integrated tools.

---

## Commands

| Command | Description |
|---------|-------------|
| `cm code check` | Run all enabled code checks |
| `cm code audit` | Verify tool configs exist and match requirements |
| `cm validate config` | Validate check.toml configuration (uses Zod schema) |
| `cm validate registry` | Validate registry structure (rulesets/*.toml) |
| `cm schema config` | Output JSON schema for check.toml configuration |
| `cm init` | Create check.toml with default configuration |
| `cm check` | Alias for `cm code check` |
| `cm audit` | Alias for `cm code audit` |

### How `cm validate config` Works

Validates your `check.toml` in two steps:
1. **TOML parsing** - Checks syntax via `@iarna/toml`
2. **Schema validation** - Validates structure via Zod schema (`configSchema.safeParse()`)

```bash
$ cm validate config
✓ Valid: /path/to/check.toml

$ cm validate config -f json
{"valid": true, "configPath": "/path/to/check.toml"}
```

### Output Formats

```bash
cm code check              # Text output (default)
cm code check -f json      # JSON output
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Violations found |
| 2 | Configuration error |
| 3 | Runtime error |

---

## Linting

### ESLint (`[code.linting.eslint]`)

JavaScript/TypeScript linting using ESLint.

**Config:**
```toml
[code.linting.eslint]
enabled = true
```

**Advanced Config:**
```toml
[code.linting.eslint]
enabled = true
files = ["src/**/*.ts", "src/**/*.tsx"]
ignore = ["**/*.test.ts"]
max-warnings = 0

[code.linting.eslint.rules]
"no-unused-vars" = "error"
"no-console" = "warn"
"complexity" = { severity = "error", max = 10 }
"max-lines" = { severity = "error", max = 300, skipBlankLines = true, skipComments = true }
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | ESLint |
| Languages | JavaScript, TypeScript |
| Config Files | `eslint.config.js`, `eslint.config.mjs`, `.eslintrc.*` |
| Command | `npx eslint . --format json` |

**Features:**
- Parses ESLint JSON output for violations
- Extracts file, line, column, rule, message, severity
- Skips gracefully when ESLint not installed
- Skips when no ESLint config found
- **Audit mode**: Verifies ESLint rules match check.toml requirements
- **Rules with options**: Supports TOML-friendly object format for rule configuration

---

### Ruff (`[code.linting.ruff]`)

Python linting using Ruff (extremely fast Python linter written in Rust).

**Config:**
```toml
[code.linting.ruff]
enabled = true
format = false  # Also check formatting (see Ruff Format below)
```

**Advanced Config:**
```toml
[code.linting.ruff]
enabled = true
format = true
line-length = 88

[code.linting.ruff.lint]
select = ["E", "F", "W"]
ignore = ["E501"]
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | Ruff |
| Languages | Python |
| Config Files | `ruff.toml`, `pyproject.toml` |
| Command | `ruff check . --output-format json` |

**Features:**
- Parses Ruff JSON output for violations
- Supports `select` and `ignore` rule configuration
- Configurable line length
- Skips gracefully when Ruff not installed

---

## Formatting

### Prettier (`[code.formatting.prettier]`)

JavaScript/TypeScript formatting check using Prettier.

**Config:**
```toml
[code.formatting.prettier]
enabled = true
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | Prettier |
| Languages | JavaScript, TypeScript, JSON, CSS, etc. |
| Config Files | `.prettierrc`, `.prettierrc.json`, `prettier.config.js` |
| Command | `npx prettier --check .` |

**Features:**
- Reports unformatted files as violations
- Parses Prettier's file list output
- Skips gracefully when Prettier not installed

---

### Ruff Format (`[code.linting.ruff] format = true`)

Python formatting check using Ruff's built-in formatter (drop-in Black replacement, ~100x faster).

**Config:**
```toml
[code.linting.ruff]
enabled = true
format = true  # Enable formatting check
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | Ruff Format |
| Languages | Python |
| Config Files | `ruff.toml`, `pyproject.toml` |
| Command | `ruff format --check .` |

**Features:**
- Reports unformatted Python files
- Uses exit code 1 when files need formatting
- Shares config with Ruff linting

---

## Type Checking

### TypeScript (`[code.types.tsc]`)

TypeScript type checking using the TypeScript compiler.

**Config:**
```toml
[code.types.tsc]
enabled = true
```

**Advanced Config (Audit Mode):**
```toml
[code.types.tsc]
enabled = true

[code.types.tsc.require]
strict = true
noImplicitAny = true
strictNullChecks = true
noUnusedLocals = true
noUnusedParameters = true
esModuleInterop = true
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | tsc (TypeScript Compiler) |
| Languages | TypeScript |
| Config Files | `tsconfig.json` |
| Command | `npx tsc --noEmit` |

**Features:**
- Parses tsc output format: `file(line,col): error TSxxxx: message`
- Extracts TypeScript error codes (TS2322, TS7006, etc.)
- Skips when no tsconfig.json found
- **Audit mode**: Verifies tsconfig.json compiler options match required values

**Auditable Options:**
| Option | Description |
|--------|-------------|
| `strict` | Enable all strict type checking options |
| `noImplicitAny` | Error on expressions with implied 'any' type |
| `strictNullChecks` | Enable strict null checks |
| `noUnusedLocals` | Report errors on unused locals |
| `noUnusedParameters` | Report errors on unused parameters |
| `noImplicitReturns` | Report error when not all code paths return |
| `noFallthroughCasesInSwitch` | Report errors for fallthrough cases in switch |
| `esModuleInterop` | Enable ES module interop |
| `skipLibCheck` | Skip type checking of declaration files |
| `forceConsistentCasingInFileNames` | Ensure consistent casing in imports |

---

### ty (`[code.types.ty]`)

Python type checking using ty (Astral's extremely fast Python type checker written in Rust).

**Config:**
```toml
[code.types.ty]
enabled = true
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | ty (Astral) |
| Languages | Python |
| Config Files | `ty.toml`, `pyproject.toml` (requires `[tool.ty]` section) |
| Command | `uvx ty check --output-format concise .` |

**Features:**
- Parses concise output format: `file:line:column: severity[rule-code] message`
- Supports both `error` and `warning` severities
- Handles exit codes: 0=pass, 1=errors, 2=config error, 101=internal
- Runs via uvx for easy installation

---

## Unused Code Detection

### Knip (`[code.unused.knip]`)

Unused code detection for JavaScript/TypeScript projects.

**Config:**
```toml
[code.unused.knip]
enabled = true
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | Knip |
| Languages | JavaScript, TypeScript |
| Config Files | `package.json` (required) |
| Command | `npx knip --reporter json` |

**Detects:**
- Unused files (orphaned)
- Unused dependencies
- Unused devDependencies
- Unused exports
- Unused types/interfaces
- Unlisted dependencies
- Duplicate exports

---

### Vulture (`[code.unused.vulture]`)

Dead code detection for Python projects.

**Config:**
```toml
[code.unused.vulture]
enabled = true
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | Vulture |
| Languages | Python |
| Config Files | `pyproject.toml` |
| Command | `vulture .` |

**Detects:**
- Unused functions
- Unused classes
- Unused variables
- Unused imports
- Unused methods
- Unused attributes
- Unreachable code

---

## Test Validation

### Tests (`[code.tests]`)

Validates that test files exist in the project.

**Config:**
```toml
[code.tests]
enabled = true
pattern = "**/*.{test,spec}.{ts,tsx,js,jsx,py}"
min_test_files = 1
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | Built-in (glob) |
| Languages | Any |
| Config Files | None |

**Options:**
| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `false` | Enable test file validation |
| `pattern` | `**/*.{test,spec}.{ts,tsx,js,jsx,py}` | Glob pattern for test files |
| `min_test_files` | `1` | Minimum number of test files required (0 = just verify pattern works) |

**Features:**
- Configurable glob patterns (supports Go, Rust, etc.)
- Ignores `node_modules` and `.git` directories
- Reports count of found vs required test files

---

## Security

### Gitleaks / Secrets (`[code.security.secrets]`)

Hardcoded secrets detection using Gitleaks.

**Config:**
```toml
[code.security.secrets]
enabled = true
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | Gitleaks |
| Languages | Any |
| Config Files | `.gitleaks.toml`, `gitleaks.toml` |
| Command | `gitleaks detect --no-git --report-format json` |

**Detects:**
- API keys
- AWS credentials
- Database connection strings
- Private keys
- Tokens and secrets
- Passwords in code

**Features:**
- Parses Gitleaks JSON output
- Reports file, line, and secret type
- Skips gracefully when Gitleaks not installed
- Supports custom Gitleaks config files

---

### npm audit / pnpm audit (`[code.security.npmaudit]`)

Dependency vulnerability scanning for JavaScript/TypeScript projects.

**Config:**
```toml
[code.security.npmaudit]
enabled = true
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | npm audit / pnpm audit |
| Languages | JavaScript, TypeScript |
| Config Files | `package-lock.json` or `pnpm-lock.yaml` |
| Command | `npm audit --json` or `pnpm audit --json` |

**Features:**
- Auto-detects package manager (pnpm or npm) based on lock file
- Parses audit JSON output for vulnerabilities
- Severity mapping: critical/high → error, moderate/low/info → warning
- Reports fix availability and breaking changes
- Skips gracefully when npm/pnpm not installed

---

### pip-audit (`[code.security.pipaudit]`)

Dependency vulnerability scanning for Python projects.

**Config:**
```toml
[code.security.pipaudit]
enabled = true
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | pip-audit |
| Languages | Python |
| Config Files | `requirements.txt`, `pyproject.toml`, `setup.py` |
| Command | `uvx pip-audit -r requirements.txt --format json` |

**Features:**
- Parses pip-audit JSON output for vulnerabilities
- Severity mapping: fix available → error, no fix → warning
- Reports CVE identifiers and fix versions
- Skips gracefully when pip-audit not installed
- Uses `-r requirements.txt` to audit project dependencies

---

## Naming Conventions

### Naming (`[code.naming]`)

Validates file and folder naming conventions.

**Config:**
```toml
[code.naming]
enabled = true

[[code.naming.rules]]
extensions = ["ts", "tsx"]
file_case = "kebab-case"
folder_case = "kebab-case"

[[code.naming.rules]]
extensions = ["py"]
file_case = "snake_case"
folder_case = "snake_case"
exclude = ["tests/**"]
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | Built-in |
| Languages | Any |
| Config Files | None |

**Supported Case Types:**
| Case | Example |
|------|---------|
| `kebab-case` | `my-component.ts` |
| `snake_case` | `my_module.py` |
| `camelCase` | `myFunction.ts` |
| `PascalCase` | `MyComponent.tsx` |

**Options per Rule:**
| Option | Required | Description |
|--------|----------|-------------|
| `extensions` | Yes | File extensions to validate (e.g., `["ts", "tsx"]`) |
| `file_case` | Yes | Required case for file names |
| `folder_case` | Yes | Required case for folder names |
| `exclude` | No | Glob patterns to exclude from validation |

**Features:**
- Validates both file names and containing folder names
- Skips special files like `__init__.py` and `_internal.py`
- Handles numeric filenames (e.g., `404.tsx`, `500.tsx` for Next.js error pages)
- Supports multiple rules for different file types

---

## Code Quality

### Disable Comments (`[code.quality.disable-comments]`)

Detects and reports linter disable comments in code.

**Config:**
```toml
[code.quality.disable-comments]
enabled = true
```

**Advanced Config:**
```toml
[code.quality.disable-comments]
enabled = true
extensions = ["ts", "tsx", "js", "jsx", "py"]
exclude = ["tests/**", "**/*.test.ts"]
patterns = [
  "eslint-disable",
  "@ts-ignore",
  "# noqa"
]
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | Built-in |
| Languages | JavaScript, TypeScript, Python |
| Config Files | None |

**Default Patterns Detected:**
| Language | Patterns |
|----------|----------|
| ESLint | `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line` |
| TypeScript | `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` |
| Python | `# noqa`, `# type: ignore`, `# pylint: disable`, `# pragma: no cover` |
| Prettier | `prettier-ignore` |

**Options:**
| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `false` | Enable disable comments detection |
| `patterns` | (see above) | Override default patterns to detect |
| `extensions` | `["ts", "tsx", "js", "jsx", "py"]` | File extensions to scan |
| `exclude` | `[]` | Glob patterns to exclude from scanning |

---

## Registry & Extends

### Configuration Inheritance

Extend configuration from remote registries or local paths.

**Config:**
```toml
[extends]
registry = "github:myorg/standards"
rulesets = ["base", "typescript"]

# Local overrides
[code.linting.eslint]
enabled = true
```

**Registry Formats:**
| Format | Example |
|--------|---------|
| GitHub | `github:owner/repo` |
| GitHub with ref | `github:owner/repo@v1.0.0` |
| Local path | `/path/to/registry` |

**Features:**
- Merge multiple rulesets in order
- Local configuration overrides inherited settings
- GitHub repositories cached in `/tmp/cm-registry-cache/`
- Registry validation via `cm validate registry`

**Registry Structure:**
```
registry/
├── rulesets/
│   ├── base.toml
│   ├── typescript.toml
│   └── python.toml
```

---

## Configuration Reference

### Full Example

```toml
# Extend from a registry
[extends]
registry = "github:myorg/standards"
rulesets = ["typescript-internal"]

# Linting
[code.linting.eslint]
enabled = true
files = ["src/**/*.ts"]
max-warnings = 0

[code.linting.eslint.rules]
"no-unused-vars" = "error"
"complexity" = { severity = "error", max = 10 }

[code.linting.ruff]
enabled = true
format = true
line-length = 88

[code.linting.ruff.lint]
select = ["E", "F", "W"]

# Formatting
[code.formatting.prettier]
enabled = true

# Type Checking
[code.types.tsc]
enabled = true

[code.types.tsc.require]
strict = true
noImplicitAny = true

[code.types.ty]
enabled = true

# Unused Code Detection
[code.unused.knip]
enabled = true

[code.unused.vulture]
enabled = true

# Test Validation
[code.tests]
enabled = true
pattern = "**/*.{test,spec}.{ts,tsx,js,jsx}"
min_test_files = 5

# Security
[code.security.secrets]
enabled = true

[code.security.npmaudit]
enabled = true

[code.security.pipaudit]
enabled = true

# Naming Conventions
[code.naming]
enabled = true

[[code.naming.rules]]
extensions = ["ts", "tsx"]
file_case = "kebab-case"
folder_case = "kebab-case"

[[code.naming.rules]]
extensions = ["py"]
file_case = "snake_case"
folder_case = "snake_case"

# Code Quality
[code.quality.disable-comments]
enabled = true
exclude = ["tests/**"]
```

### Config Discovery

The CLI automatically discovers `check.toml` by walking up the directory tree from the current working directory. You can also specify a path:

```bash
cm code check -c path/to/check.toml
```

---

## Architecture

```
src/
├── cli.ts              # Commander.js CLI entry point
├── index.ts            # Library exports
├── code/
│   ├── index.ts        # CODE domain runner, tool registry
│   └── tools/
│       ├── base.ts     # BaseToolRunner abstract class
│       ├── eslint.ts   # ESLint integration
│       ├── ruff.ts     # Ruff linting integration
│       ├── ruff-format.ts  # Ruff formatting integration
│       ├── prettier.ts # Prettier integration
│       ├── tsc.ts      # TypeScript integration
│       ├── ty.ts       # ty integration
│       ├── knip.ts     # Knip integration
│       ├── vulture.ts  # Vulture integration
│       ├── tests.ts    # Test file validation
│       ├── npmaudit.ts # npm/pnpm audit integration
│       ├── pipaudit.ts # pip-audit integration
│       ├── gitleaks.ts # Gitleaks secrets detection
│       ├── naming.ts   # Naming conventions validation
│       └── disable-comments.ts # Disable comments detection
├── config/
│   ├── loader.ts       # Config loading and merging
│   └── schema.ts       # Zod schemas
├── output/
│   └── index.ts        # Text and JSON formatters
└── types/
    └── index.ts        # Shared TypeScript types
```

---

## Tool Summary

| Category | Tool | Languages | Config Key |
|----------|------|-----------|------------|
| **Linting** | ESLint | JS/TS | `[code.linting.eslint]` |
| **Linting** | Ruff | Python | `[code.linting.ruff]` |
| **Formatting** | Prettier | JS/TS/CSS/JSON | `[code.formatting.prettier]` |
| **Formatting** | Ruff Format | Python | `[code.linting.ruff] format = true` |
| **Types** | tsc | TypeScript | `[code.types.tsc]` |
| **Types** | ty | Python | `[code.types.ty]` |
| **Unused** | Knip | JS/TS | `[code.unused.knip]` |
| **Unused** | Vulture | Python | `[code.unused.vulture]` |
| **Tests** | Built-in | Any | `[code.tests]` |
| **Security** | Gitleaks | Any | `[code.security.secrets]` |
| **Security** | npm/pnpm audit | JS/TS | `[code.security.npmaudit]` |
| **Security** | pip-audit | Python | `[code.security.pipaudit]` |
| **Naming** | Built-in | Any | `[code.naming]` |
| **Quality** | Disable Comments | JS/TS/Python | `[code.quality.disable-comments]` |

---

## Roadmap Status

### v0.1 - MVP (Complete)
- [x] ESLint
- [x] Ruff
- [x] tsc

### v0.2 - Formatting & Structure (Complete)
- [x] Prettier
- [x] Ruff Format
- [x] Knip
- [x] Vulture
- [x] Tests Validation

### v0.3 - Security & Python Types (Complete)
- [x] ty (Python type checker)
- [x] npm audit (JS/TS dependency vulnerabilities)
- [x] pip-audit (Python dependency vulnerabilities)

### v0.4+ - Advanced Features (Complete)
- [x] Gitleaks (secrets detection)
- [x] Registry extends functionality
- [x] Config value auditing (tsconfig.json)
- [x] Naming conventions validation
- [x] ESLint rules auditing
- [x] pnpm support
- [x] Disable comments detection

### Future
- [ ] PROCESS domain (PR checks, branch naming, commit conventions)
- [ ] STACK domain (tool versions, environment variables)
- [ ] Config inheritance improvements

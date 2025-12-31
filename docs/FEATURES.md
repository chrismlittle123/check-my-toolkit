# Features - check-my-toolkit v0.6.0

Unified project health checks for code quality, process compliance, and stack validation.

## Overview

check-my-toolkit (`cm`) provides a single CLI to run multiple code quality tools with unified configuration via `check.toml`. Currently focused on the **CODE** domain with 9 integrated tools.

```
Total Tests: 430 (unit + e2e)
Tool Implementations: ~1,550 lines of TypeScript
```

---

## Commands

| Command | Description |
|---------|-------------|
| `cm code check` | Run all enabled code checks |
| `cm code audit` | Verify tool configs exist without running checks |
| `cm validate` | Validate check.toml configuration (uses Zod schema) |
| `cm init` | Create default check.toml |

### How `cm validate` Works

Validates your `check.toml` in two steps:
1. **TOML parsing** - Checks syntax via `@iarna/toml`
2. **Schema validation** - Validates structure via Zod schema (`configSchema.safeParse()`)

```bash
$ cm validate
✓ Valid: /path/to/check.toml

$ cm validate -f json
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

**Details:**
| Property | Value |
|----------|-------|
| Tool | ESLint |
| Languages | JavaScript, TypeScript |
| Config Files | `eslint.config.js`, `eslint.config.mjs`, `.eslintrc.*` |
| Command | `npx eslint . --format json` |
| Unit Tests | 16 |
| E2E Tests | 12+ |

**Features:**
- Parses ESLint JSON output for violations
- Extracts file, line, column, rule, message, severity
- Skips gracefully when ESLint not installed
- Skips when no ESLint config found

---

### Ruff (`[code.linting.ruff]`)

Python linting using Ruff (extremely fast Python linter written in Rust).

**Config:**
```toml
[code.linting.ruff]
enabled = true
format = false  # Also check formatting (see Ruff Format below)
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | Ruff |
| Languages | Python |
| Config Files | `ruff.toml`, `pyproject.toml` |
| Command | `ruff check . --output-format json` |
| Unit Tests | 24 |
| E2E Tests | 6+ |

**Features:**
- Parses Ruff JSON output for violations
- Supports `select` and `ignore` rule configuration
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
| Unit Tests | 25 |
| E2E Tests | 3 |

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
| Unit Tests | 22 |
| E2E Tests | 3 |

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

**Advanced Config:**
```toml
[code.types.tsc]
enabled = true
strict = true
noImplicitAny = true
strictNullChecks = true
noUnusedLocals = true
noUnusedParameters = true
```

**Details:**
| Property | Value |
|----------|-------|
| Tool | tsc (TypeScript Compiler) |
| Languages | TypeScript |
| Config Files | `tsconfig.json` |
| Command | `npx tsc --noEmit` |
| Unit Tests | 19 |
| E2E Tests | 4+ |

**Features:**
- Parses tsc output format: `file(line,col): error TSxxxx: message`
- Extracts TypeScript error codes (TS2322, TS7006, etc.)
- Skips when no tsconfig.json found
- Supports all tsc strict mode options

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
| Config Files | `ty.toml`, `pyproject.toml` |
| Command | `uvx ty check --output-format concise .` |
| Unit Tests | 23 |
| E2E Tests | 3 |

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
| Unit Tests | 24 |
| E2E Tests | 10 |

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
| Unit Tests | 27 |
| E2E Tests | 6 |

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
| Unit Tests | 25 |
| E2E Tests | 4 |

**Options:**
| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `false` | Enable test file validation |
| `pattern` | `**/*.{test,spec}.{ts,tsx,js,jsx,py}` | Glob pattern for test files |
| `min_test_files` | `1` | Minimum number of test files required |

**Features:**
- Configurable glob patterns (supports Go, Rust, etc.)
- Ignores `node_modules` and `.git` directories
- Reports count of found vs required test files

---

## Configuration Reference

### Full Example

```toml
# Linting
[code.linting.eslint]
enabled = true

[code.linting.ruff]
enabled = true
format = true  # Also check formatting

# Formatting
[code.formatting.prettier]
enabled = true

# Type Checking
[code.types.tsc]
enabled = true
strict = true

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
```

### Config Discovery

The CLI automatically discovers `check.toml` by walking up the directory tree from the current working directory. You can also specify a path:

```bash
cm code check -c path/to/check.toml
```

---

## Test Coverage Summary

| Tool | Unit Tests | E2E Tests |
|------|------------|-----------|
| ESLint | 16 | 12+ |
| Ruff | 24 | 6+ |
| Ruff Format | 22 | 3 |
| Prettier | 25 | 3 |
| tsc | 19 | 4+ |
| ty | 23 | 3 |
| Knip | 24 | 10 |
| Vulture | 27 | 6 |
| Tests Validation | 25 | 4 |
| **Other** | 80+ | 20+ |
| **Total** | **~340** | **~90** |

**Grand Total: 430 tests**

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
│       └── tests.ts    # Test file validation
├── config/
│   ├── loader.ts       # Config loading and merging
│   └── schema.ts       # Zod schemas
├── output/
│   └── index.ts        # Text and JSON formatters
└── types/
    └── index.ts        # Shared TypeScript types
```

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

### v0.3 - Security & Python Types (In Progress)
- [x] ty (Python type checker)
- [ ] Gitleaks (secrets detection)
- [ ] Semgrep (SAST)
- [ ] npm-audit (JS/TS dependency vulnerabilities)
- [ ] pip-audit (Python dependency vulnerabilities)
- [ ] Required Files (`[code.files]`)

### Future
- [ ] PROCESS domain (PR checks, branch naming, commit conventions)
- [ ] STACK domain (tool versions, environment variables)
- [ ] Config inheritance (`[extends]`)
- [ ] Config generation (`cm code generate eslint`)

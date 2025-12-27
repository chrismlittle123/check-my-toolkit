# CODE Domain Roadmap

Static analysis, security, and code quality enforcement.

## Overview

The CODE domain validates source code quality through linting, type checking, formatting, and security scanning. It wraps existing tools (ESLint, Ruff, tsc) and provides unified configuration via `check.toml`.

```toml
[code]
├── [code.linting]      # ESLint, Ruff (lint)
├── [code.formatting]   # Prettier, Ruff (format)
├── [code.types]        # tsc, ty
├── [code.unused]       # Knip, Vulture
├── [code.tests]        # Test files exist, naming patterns
├── [code.security]     # Secrets, SAST, dependency audits
└── [code.files]        # Required files & configs
```

> **Note on Ruff:** Ruff handles both linting (`ruff check`) and formatting (`ruff format`),
> replacing the need for separate Black installation. Configure in `ruff.toml`.

> **Note on complexity:** Use ESLint rules (`max-lines`, `max-depth`, `complexity`) for JS/TS
> and Ruff rules (`C901`, `PLR0912`, `PLR0915`) for Python. Configure in your linter configs.

---

## v0.1 — MVP (CODE-only)

First release focuses entirely on CODE domain fundamentals.

### Linting: `[code.linting]`

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| ESLint | JavaScript/TypeScript linting | ESLint |
| Ruff | Python linting | Ruff |

```toml
[code.linting]
eslint = true
ruff = true
```

**Behavior:**
- Skip tool if not installed (warn, don't fail)
- Use project's existing config (eslint.config.js, ruff.toml)
- Collect violations, report in unified format

### Type Checking: `[code.types]`

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| TypeScript | Type checking | tsc |

```toml
[code.types]
tsc = true
```

#### TypeScript Configuration: `[code.types.tsc]`

| Option | Description | Default |
|--------|-------------|---------|
| `strict` | Enable all strict type checking options | `false` |
| `noImplicitAny` | Error on expressions/declarations with implied `any` | `false` |
| `strictNullChecks` | Enable strict null checks | `false` |
| `strictFunctionTypes` | Enable strict checking of function types | `false` |
| `strictBindCallApply` | Enable strict bind/call/apply methods | `false` |
| `strictPropertyInitialization` | Ensure class properties are initialized | `false` |
| `noImplicitThis` | Error on `this` with implied `any` type | `false` |
| `useUnknownInCatchVariables` | Type catch clause variables as `unknown` | `false` |
| `alwaysStrict` | Parse in strict mode and emit "use strict" | `false` |
| `noUnusedLocals` | Error on unused local variables | `false` |
| `noUnusedParameters` | Error on unused parameters | `false` |
| `noImplicitReturns` | Error on missing return statements | `false` |
| `noFallthroughCasesInSwitch` | Error on fallthrough cases in switch | `false` |
| `noUncheckedIndexedAccess` | Add `undefined` to index signature results | `false` |
| `exactOptionalPropertyTypes` | Differentiate `undefined` vs missing | `false` |
| `skipLibCheck` | Skip type checking of declaration files | `true` |

```toml
[code.types.tsc]
# Preset: use "strict" to enable all strict options at once
strict = true

# Or configure individually:
noImplicitAny = true
strictNullChecks = true
strictFunctionTypes = true
strictBindCallApply = true
strictPropertyInitialization = true
noImplicitThis = true
useUnknownInCatchVariables = true
alwaysStrict = true

# Additional strictness (not included in "strict")
noUnusedLocals = true
noUnusedParameters = true
noImplicitReturns = true
noFallthroughCasesInSwitch = true
noUncheckedIndexedAccess = true
exactOptionalPropertyTypes = true
skipLibCheck = true
```

**Behavior:**
- Skip if no `tsconfig.json` found (warn)
- Report type errors in unified format

### Audit Command

`cm audit` and `cm code audit` verify configs exist without running tools.

| Check | Description |
|-------|-------------|
| Config exists | eslint.config.js, ruff.toml, tsconfig.json exist |
| Config matches | Generated config matches check.toml rules |
| Required files | README.md, LICENSE, etc. exist |

```bash
$ cm audit

[code.linting]
  ✓ eslint.config.js exists
  ✗ ruff.toml missing

[code.types]
  ✓ tsconfig.json exists

[code.files]
  ✓ README.md exists
  ✗ LICENSE missing

audit: 2 issues found
```

### Output Format

```
[code.linting] ESLint
  ✗ src/index.ts:10:5 - 'foo' is assigned but never used (@typescript-eslint/no-unused-vars)
  ✗ src/utils.ts:25:1 - Missing return type (@typescript-eslint/explicit-function-return-type)

[code.linting] Ruff
  ✗ src/main.py:15:1 - F401 'os' imported but unused

[code.types] tsc
  ✗ src/index.ts:20:10 - Type 'string' is not assignable to type 'number'

code: 4 violations found
```

---

## v0.2 — Formatting & Structure

### Formatting: `[code.formatting]`

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Prettier | JavaScript/TypeScript formatting | Prettier |
| Ruff Format | Python formatting | Ruff (`ruff format`) |

> **Note:** Ruff's formatter is a drop-in replacement for Black, producing nearly identical
> output but ~100x faster. No need for separate Black installation.

```toml
[code.formatting]
prettier = true

[code.linting.ruff]
enabled = true
format = true  # Also check formatting with ruff format
```

### Tests: `[code.tests]`

| Check | Description | Data Source |
|-------|-------------|-------------|
| Test files exist | At least one test file present | Local filesystem |
| Test naming | Files match pattern (*.test.ts, *.spec.ts) | Local filesystem |

```toml
[code.tests]
pattern = "**/*.{test,spec}.{ts,tsx,js,jsx,py}"
min_test_files = 1
```

### Unused Code Detection: `[code.unused]`

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Unused exports (TS) | Dead exports, files, dependencies | Knip |
| Unused code (Python) | Dead code detection | Vulture |

```toml
[code.unused]
knip = true
vulture = true
```

#### Knip Configuration: `[code.unused.knip]`

| Option | Description | Default |
|--------|-------------|---------|
| `exports` | Check for unused exports | `true` |
| `files` | Check for unused files | `true` |
| `dependencies` | Check for unused dependencies | `true` |
| `devDependencies` | Check for unused devDependencies | `true` |
| `types` | Check for unused types/interfaces | `true` |
| `duplicates` | Check for duplicate exports | `true` |
| `enumMembers` | Check for unused enum members | `false` |
| `classMembers` | Check for unused class members | `false` |
| `ignore` | Patterns to ignore | `[]` |
| `entry` | Custom entry files | `[]` |
| `project` | Custom project files | `[]` |

```toml
[code.unused.knip]
exports = true
files = true
dependencies = true
devDependencies = true
types = true
duplicates = true
enumMembers = false
classMembers = false
ignore = ["**/generated/**", "**/*.d.ts"]
entry = ["src/index.ts", "src/cli.ts"]
project = ["src/**/*.ts"]
```

#### Vulture Configuration: `[code.unused.vulture]`

| Option | Description | Default |
|--------|-------------|---------|
| `min_confidence` | Minimum confidence threshold (60-100) | `80` |
| `ignore_names` | Names to ignore (supports wildcards) | `[]` |
| `ignore_decorators` | Decorators that mark code as used | `[]` |
| `paths` | Paths to scan | `["."]` |
| `exclude` | Patterns to exclude | `[]` |

```toml
[code.unused.vulture]
min_confidence = 80
ignore_names = ["visit_*", "test_*", "_*"]
ignore_decorators = ["@app.route", "@pytest.fixture", "@property"]
paths = ["src/", "tests/"]
exclude = ["**/migrations/**", "**/vendor/**"]
```

---

## v0.3 — Security & Python Types

### Type Checking (Python): `[code.types]`

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| ty | Python type checking | ty (Astral) |

```toml
[code.types]
tsc = true
ty = true
```

#### Python Type Checker Configuration: `[code.types.ty]`

| Option | Description | Default |
|--------|-------------|---------|
| `strict` | Enable all strict type checking options | `false` |
| `warn_return_any` | Warn when returning `Any` from typed function | `false` |
| `warn_unreachable` | Warn about unreachable code | `false` |
| `disallow_untyped_defs` | Disallow defining functions without types | `false` |
| `disallow_untyped_calls` | Disallow calling untyped functions | `false` |
| `disallow_incomplete_defs` | Disallow partially typed function definitions | `false` |
| `disallow_any_generics` | Disallow `Any` in generic type parameters | `false` |
| `disallow_any_unimported` | Disallow `Any` types from unimported modules | `false` |
| `disallow_any_expr` | Disallow all expressions with `Any` type | `false` |
| `disallow_any_decorated` | Disallow `Any` in decorated functions | `false` |
| `disallow_any_explicit` | Disallow explicit `Any` annotations | `false` |
| `disallow_subclassing_any` | Disallow subclassing `Any` | `false` |
| `check_untyped_defs` | Type check inside untyped functions | `false` |
| `ignore_missing_imports` | Suppress errors for missing imports | `false` |
| `follow_imports` | How to handle imports (`normal`, `silent`, `skip`, `error`) | `"normal"` |
| `python_version` | Target Python version | `"3.11"` |
| `exclude` | Patterns to exclude from checking | `[]` |

```toml
[code.types.ty]
# Preset: use "strict" to enable all strict options at once
strict = true

# Or configure individually:
warn_return_any = true
warn_unreachable = true
disallow_untyped_defs = true
disallow_untyped_calls = true
disallow_incomplete_defs = true
disallow_any_generics = true
check_untyped_defs = true

# Import handling
ignore_missing_imports = false
follow_imports = "normal"

# Target version
python_version = "3.11"

# Exclusions
exclude = ["**/migrations/**", "**/vendor/**", "**/__pycache__/**"]
```

### Security Scanning: `[code.security]`

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Secrets | Hardcoded secrets detection | Gitleaks |
| SAST | Static security analysis | Semgrep |
| Dependency audit (TS) | Vulnerability scanning | npm-audit |
| Dependency audit (Python) | Vulnerability scanning | pip-audit |

```toml
[code.security]
secrets = true
sast = true
npm_audit = true
pip_audit = true
```

### Required Files: `[code.files]`

| Check | Description | Data Source |
|-------|-------------|-------------|
| Repo files | README.md, LICENSE, SECURITY.md | Local filesystem |
| Tooling configs | eslint.config.js, ruff.toml, tsconfig.json | Local filesystem |
| Docs | CLAUDE.md, ADRs | Local filesystem |

```toml
[code.files]
repo = ["README.md", "LICENSE", "SECURITY.md"]
tooling = ["eslint.config.js", "ruff.toml", "tsconfig.json"]
docs = ["CLAUDE.md"]
```

---

## v0.4 — Config Inheritance & Generation

### Remote Config Inheritance

| Feature | Description |
|---------|-------------|
| Extends support | `[extends]` section in check.toml |
| Remote fetching | `github:owner/repo/path@version` format |
| Version pinning | `@v1.0.0`, `@latest` via manifest |
| SSH auth | Uses ambient git credentials for private repos |
| Additive-only | Block local rules from conflicting with inherited |

```toml
[extends]
rulesets = "github:org/standards/rulesets@v1.0.0"
```

### Generate & Audit Commands

| Command | Description |
|---------|-------------|
| `cm code generate eslint` | Generate eslint.config.js from check.toml |
| `cm code generate ruff` | Generate ruff.toml from check.toml |
| `cm code generate tsc` | Generate tsconfig.json from check.toml |
| `cm code audit` | Verify linter configs match check.toml |
| `cm code context` | Output rules for AI agents |

---

## v0.5 — Validation & Registry

| Command | Description |
|---------|-------------|
| `cm code validate` | Validate check.toml against JSON schema |
| `cm code registry list` | List prompts/rulesets with filtering |
| `cm code registry check` | Verify if entry exists |
| `cm code registry sync` | Detect sync issues |
| `cm code registry bump` | Create new versions |

---

## v0.6 — Documentation Files

| Check | Description | Data Source |
|-------|-------------|-------------|
| ADRs | Required ADRs exist, follow template | Local filesystem |
| RFCs | Required for major changes | Local filesystem |
| Service READMEs | Required sections present | Local filesystem |
| Runbooks | Required for production services | Local filesystem |

```toml
[code.files]
docs = ["CLAUDE.md"]
adr_directory = "docs/adr"
adr_template = "docs/adr/template.md"
require_service_readme = true
readme_required_sections = ["Overview", "Setup", "API", "Deployment"]
```

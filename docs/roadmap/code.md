# CODE Domain Roadmap

Static analysis, security, and code quality enforcement.

## Overview

The CODE domain validates source code quality through linting, type checking, formatting, and security scanning. It wraps existing tools (ESLint, Ruff, tsc) and provides unified configuration via `check.toml`.

```toml
[code]
├── [code.linting]      # ESLint, Ruff
├── [code.formatting]   # Prettier, Black
├── [code.types]        # tsc, ty
├── [code.unused]       # Knip, Vulture
├── [code.complexity]   # File/function size, nesting, cyclomatic
├── [code.tests]        # Test files exist, naming patterns
├── [code.security]     # Secrets, SAST, dependency audits
└── [code.files]        # Required files & configs
```

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
| Black | Python formatting | Black |

```toml
[code.formatting]
prettier = true
black = true
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

### Complexity: `[code.complexity]`

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Max file lines | Maximum lines per file | Native AST |
| Max function lines | Maximum lines per function | Native AST |
| Max parameters | Maximum function parameters | Native AST |
| Max nesting depth | Maximum nesting depth | Native AST |

```toml
[code.complexity]
max_file_lines = 500
max_function_lines = 50
max_parameters = 5
max_nesting_depth = 4
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

---

## Future

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Naming conventions | Files, directories | ls-lint |
| Complexity | Cyclomatic/cognitive | ESLint plugins |
| Commit messages | Conventional commits | commitlint |
| License headers | Required headers | addlicense |
| API contracts | OpenAPI/GraphQL | Spectral |
| Dependency health | Outdated, deprecated | npm-check |
| Import ordering | Consistent structure | ESLint plugins |
| TODO/FIXME tracking | Stale todos | custom |
| Test coverage | Minimum thresholds | nyc |
| Bundle size | Max artifact size | size-limit |

# check-my-toolkit

A unified CLI for enforcing code quality standards across projects. One config file, multiple tools, consistent output.

```bash
npm install -g check-my-toolkit
```

## Why?

Most projects cobble together ESLint, Prettier, Ruff, tsc, and various other tools with inconsistent configs. `cm` unifies them:

- **Single config** — `check.toml` controls all tools
- **Consistent output** — Same format whether it's ESLint or Ruff
- **Org standards** — Extend from a shared registry to enforce team conventions
- **CI-ready** — Exit codes and JSON output for automation

## Quick Start

```bash
# Create check.toml
cat > check.toml << 'EOF'
[code.linting.eslint]
enabled = true

[code.linting.ruff]
enabled = true

[code.types.tsc]
enabled = true
EOF

# Run checks
cm code check
```

Output:

```
[code.linting] ESLint
  ✗ src/index.ts:10:5 - 'foo' is assigned but never used

[code.linting] Ruff
  ✓ No violations

[code.types] tsc
  ✓ No type errors

code: 1 violation found
```

## Supported Tools

### Linting

| Tool | Language | Config |
|------|----------|--------|
| ESLint | TypeScript/JavaScript | `[code.linting.eslint]` |
| Ruff | Python | `[code.linting.ruff]` |

### Formatting

| Tool | Language | Config |
|------|----------|--------|
| Prettier | TypeScript/JavaScript | `[code.formatting.prettier]` |
| Ruff Format | Python | `[code.linting.ruff] format = true` |

### Type Checking

| Tool | Language | Config |
|------|----------|--------|
| tsc | TypeScript | `[code.types.tsc]` |
| ty | Python | `[code.types.ty]` |

### Dead Code Detection

| Tool | Language | Config |
|------|----------|--------|
| Knip | TypeScript/JavaScript | `[code.unused.knip]` |
| Vulture | Python | `[code.unused.vulture]` |

### Security

| Tool | Purpose | Config |
|------|---------|--------|
| Gitleaks | Secret detection | `[code.security.gitleaks]` |
| npm audit | JS dependency vulnerabilities | `[code.security.npm-audit]` |
| pip-audit | Python dependency vulnerabilities | `[code.security.pip-audit]` |

### Other

| Tool | Purpose | Config |
|------|---------|--------|
| Tests | Verify test files exist | `[code.tests]` |
| Naming | File/folder naming conventions | `[code.naming]` |

## Commands

```bash
cm code check              # Run all enabled checks
cm code check --format json  # JSON output for CI
cm code audit              # Verify tool configs exist
cm validate                # Validate check.toml syntax
cm validate registry       # Validate a registry structure
```

## Configuration

### Basic

```toml
[code.linting.eslint]
enabled = true

[code.linting.ruff]
enabled = true
line-length = 100
lint.select = ["E", "F", "I"]

[code.types.tsc]
enabled = true

[code.formatting.prettier]
enabled = true

[code.unused.knip]
enabled = true

[code.security.gitleaks]
enabled = true
```

### Extending from a Registry

Share standards across repos by extending from a registry:

```toml
[extends]
registry = "github:myorg/standards"
rulesets = ["typescript", "security"]
```

The registry contains reusable rulesets in `rulesets/*.toml` that get merged into your config.

### File Naming Conventions

```toml
[code.naming]
enabled = true

[code.naming.rules.kebab-ts]
pattern = "^[a-z][a-z0-9]*(-[a-z0-9]+)*$"
extensions = [".ts", ".tsx"]
exclude = ["*.test.ts", "*.spec.ts"]

[code.naming.rules.snake-py]
pattern = "^[a-z][a-z0-9]*(_[a-z0-9]+)*$"
extensions = [".py"]
```

### Test File Validation

```toml
[code.tests]
enabled = true
pattern = "**/*.test.ts"  # Glob pattern for test files
```

## CI Integration

### GitHub Actions

```yaml
- name: Install check-my-toolkit
  run: npm install -g check-my-toolkit

- name: Run code checks
  run: cm code check
```

### JSON Output

```bash
cm code check --format json
```

```json
{
  "version": "0.10.4",
  "configPath": "/path/to/check.toml",
  "domains": {
    "code": {
      "status": "fail",
      "violationCount": 1,
      "tools": { ... }
    }
  },
  "summary": {
    "totalViolations": 1,
    "exitCode": 1
  }
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Violations found |
| 2 | Configuration error |
| 3 | Runtime error |

## Roadmap

| Domain | Status | Description |
|--------|--------|-------------|
| **code** | Stable | Linting, types, formatting, security |
| **process** | Planned | PR size limits, branch naming, repo settings |

See [docs/roadmap/](docs/roadmap/) for detailed plans.

## Development

### Prerequisites

```bash
# macOS
brew bundle

# This installs Python 3.13, Ruff, Vulture for tests
```

### Commands

```bash
npm install        # Install dependencies
npm run build      # Compile TypeScript
npm test           # Run tests
npm run typecheck  # Type check
npm run lint       # Lint
```

## License

MIT

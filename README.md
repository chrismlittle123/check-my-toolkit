# check-my-toolkit

Unified project health checks for code quality, process compliance, and stack validation.

## Installation

```bash
npm install -g check-my-toolkit
```

Or use directly with npx:

```bash
npx check-my-toolkit code check
```

## Quick Start

1. Create a `check.toml` configuration file in your project root:

```toml
[code.linting]
eslint = true
ruff = true

[code.types]
tsc = true
```

2. Run checks:

```bash
cm code check
```

## Commands

| Command | Description |
|---------|-------------|
| `cm code check` | Run linting (ESLint, Ruff) and type checking (tsc) |
| `cm code audit` | Verify linting and type checking configs exist |
| `cm validate` | Validate check.toml configuration file |

## Configuration

Configuration is stored in `check.toml` at your project root.

### Code Domain

```toml
[code.linting]
eslint = true    # Run ESLint
ruff = true      # Run Ruff (Python)

[code.types]
tsc = true       # Run TypeScript type checking
```

### Config Discovery

The CLI automatically discovers `check.toml` by walking up the directory tree from the current working directory.

## Output Formats

### Text (default)

```
[code.linting] ESLint
  ✗ src/index.ts:10:5 - 'foo' is assigned but never used

[code.types] tsc
  ✓ No type errors

code: 1 violation found
```

### JSON

```bash
cm code check --format json
```

```json
{
  "version": "0.1.0",
  "configPath": "/path/to/check.toml",
  "domains": {
    "code": {
      "status": "fail",
      "violationCount": 1,
      "violations": [...]
    }
  },
  "summary": {
    "totalViolations": 1,
    "exitCode": 1
  }
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Violations found |
| 2 | Configuration error |
| 3 | Runtime error |

## Supported Tools

| Tool | Language | Command |
|------|----------|---------|
| ESLint | TypeScript/JavaScript | `eslint .` |
| Ruff | Python | `ruff check .` |
| tsc | TypeScript | `tsc --noEmit` |

Tools must be installed in your project. If a tool is not found, it will be skipped with a warning.

## CI Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run code checks
  run: npx check-my-toolkit code check
```

## Roadmap

This toolkit is designed to grow into three domains:

- **code** - Linting, type checking, code quality (current focus)
- **process** - PR checks, branch naming, commit conventions
- **stack** - Tool versions, environment variables, service dependencies

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## License

MIT

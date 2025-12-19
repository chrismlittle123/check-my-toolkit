# check-my-code Roadmap

Part of the unified `check-my-toolkit` CLI (`cm code <action>`).

---

## Purpose

Static analysis and code conventions. Wraps best-in-class tools (ESLint, Knip, MegaLinter) behind a unified config and CLI.

---

## v0.1  MVP

**Goal:** Run ESLint via `cm code check` with config from `check.toml`.

### Checks

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Linting | ESLint with project config | ESLint |

### Config

```toml
[code.linting]
enabled = true
eslint = true
```

### CLI

```bash
cm code check              # Run all code checks
cm code check --format json  # JSON output
cm code check --ci          # CI mode (exit 1 on failure)
```

### Output

**Text:**
```
cm code check v0.1.0

  [PASS] code.linting: No ESLint errors

Result: 1 passed, 0 failed
```

**JSON:**
```json
{
  "domain": "code",
  "passed": 1,
  "failed": 0,
  "results": [
    {
      "rule": "code.linting",
      "status": "pass",
      "message": "No ESLint errors"
    }
  ]
}
```

---

## v0.2  Unused Code Detection

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Unused exports | Dead exports, files, dependencies | Knip |

```toml
[code.unused]
enabled = true
```

---

## v0.3  Security Scanning

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Secrets | Hardcoded secrets detection | Gitleaks |
| SAST | Static security analysis | Semgrep |

```toml
[code.security]
enabled = true
secrets = true
sast = true
```

---

## v0.4  MegaLinter Integration

| Check | Description | Tool Wrapped |
|-------|-------------|--------------|
| Multi-language linting | All languages, formatting | MegaLinter |
| Spelling | Code comments, strings | cspell |
| Duplication | Copy-paste detection | jscpd |

```toml
[code.megalinter]
enabled = true
languages = ["typescript", "javascript", "json", "yaml", "markdown"]
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

---

## Tech Stack

| Component | Choice |
|-----------|--------|
| Language | TypeScript |
| CLI | Commander.js (shared) |
| Config | check.toml via @iarna/toml + Zod |
| Output | chalk (text), JSON |

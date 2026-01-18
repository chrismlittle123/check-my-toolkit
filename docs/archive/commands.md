Love it. Let's design this properly.

## Package & CLI Structure

```
npm package: check-my-toolkit
binary name: cm
```

When users install:

```bash
npm install -g check-my-toolkit
# or
npx check-my-toolkit
```

They get the `cm` command.

---

## Command Structure

The natural hierarchy is:

```
cm <domain> <action> [options]
```

| Domain    | What it covers                              |
| --------- | ------------------------------------------- |
| `code`    | Linting, security, unused code, conventions |
| `process` | GitHub settings, Linear rules, CI/CD, docs  |
| `stack`   | Local env, versions, services, connections  |

| Action  | What it does                                                                             |
| ------- | ---------------------------------------------------------------------------------------- |
| `check` | Validate / report issues (read-only)                                                     |
| `fix`   | Auto-fix what's possible                                                                 |
| `sync`  | Push your TOML config to external tools (generate configs, update GitHub settings, etc.) |
| `audit` | Deep inspection with detailed report                                                     |
| `init`  | Generate starter TOML config                                                             |
| `diff`  | Show what would change (dry-run for sync/fix)                                            |

---

## Full Command Matrix

```bash
# CODE
cm code check      # Run all code checks (lint, security, unused, naming)
cm code fix        # Auto-fix linting, formatting, remove unused
cm code audit      # Deep report: complexity, duplication, coverage, deps health
cm code sync       # Generate .eslintrc, .mega-linter.yml, knip.json from TOML
cm code diff       # Show what sync would change

# PROCESS
cm process check   # Validate GitHub settings, Linear config, required files
cm process fix     # Auto-fix what's possible (create missing files, etc.)
cm process audit   # Full compliance report
cm process sync    # Push TOML settings to GitHub API, Linear API
cm process diff    # Show what sync would change

# STACK
cm stack check     # Verify versions, tools, services, env vars
cm stack fix       # Install missing tools (via mise/brew), start services
cm stack audit     # Full environment health report
cm stack diff      # Show what fix would install/change

# CROSS-CUTTING
cm doctor          # Run all checks across all domains, summarized health report
cm init            # Interactive setup, generates cm.toml
cm version         # Show version
```

---

## Shorthand Aliases

For convenience:

```bash
cm check           # Alias for: cm code check && cm process check && cm stack check
cm fix             # Alias for: cm code fix && cm process fix && cm stack fix
cm sync            # Alias for: cm code sync && cm process sync
cm audit           # Alias for: cm code audit && cm process audit && cm stack audit
```

---

## Example Usage

```bash
# Developer joins project
cm stack check     # "You're missing Node 20, Docker isn't running"
cm stack fix       # Installs Node 20 via mise, starts Docker

# Before committing
cm code check      # Runs linters, security checks, finds unused exports

# Setting up a new repo
cm init            # Generates cm.toml with sensible defaults
cm sync            # Creates .eslintrc, .mega-linter.yml, updates GitHub branch protection

# CI pipeline
cm code check --ci # Exit code 1 on failure, machine-readable output
cm process check   # Verify repo config hasn't drifted

# Weekly audit
cm audit --output=report.html
```

---

## Config File: `cm.toml`

```toml
[code]
# ...

[process]
# ...

[stack]
# ...
```

Or if you want to split it:

```
.cm/
  code.toml
  process.toml
  stack.toml
```

---

## CLI Help Output (Draft)

```
$ cm --help

check-my-toolkit - Unified project health checks

Usage: cm <domain> <action> [options]

Domains:
  code       Linting, security, unused code, naming conventions
  process    GitHub settings, Linear rules, CI/CD, required files
  stack      Local environment, versions, tools, services

Actions:
  check      Validate and report issues
  fix        Auto-fix issues where possible
  sync       Push config to external tools/APIs
  audit      Generate detailed health report
  diff       Preview what sync/fix would change

Shortcuts:
  cm doctor  Run all checks, show summary
  cm init    Generate cm.toml config
  cm check   Run check across all domains
  cm fix     Run fix across all domains

Options:
  --ci       CI mode (strict exit codes, machine output)
  --verbose  Detailed output
  --quiet    Minimal output
  --config   Path to config file (default: cm.toml)

Examples:
  cm stack check          Check local environment
  cm code fix             Auto-fix code issues
  cm process sync         Push settings to GitHub/Linear
  cm doctor               Full health check
```

---

Does this structure feel right? Anything you'd rename or reorganize?

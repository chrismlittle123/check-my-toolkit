# Changelog

## 0.15.1

### Patch Changes

- d9a4a29: fix: handle ESLint rules with positional options in audit

  Rules like `max-depth`, `max-params`, and `complexity` use positional options in ESLint's effective config format (e.g., `[2, 4]` instead of `[2, { max: 4 }]`). The audit now correctly handles this format when comparing the `max` option.

## 0.15.0

### Minor Changes

- 591b99d: feat: support TOML-friendly object format for ESLint rules with options

  ESLint rules with options can now be specified using a TOML-compatible object format:

  ```toml
  [code.linting.eslint.rules]
  "complexity" = { severity = "error", max = 10 }
  "max-lines" = { severity = "error", max = 300, skipBlankLines = true, skipComments = true }
  "max-lines-per-function" = { severity = "error", max = 50 }
  ```

  The audit command now verifies both rule severities AND options match between check.toml and eslint.config.js.

## 0.14.0

### Minor Changes

- c7f768d: Require `files` config for ESLint rules audit

  **BREAKING:** When using `rules` in ESLint config, you must now specify `files` to tell the audit which files to check against.

  Before:

  ```toml
  [code.linting.eslint]
  enabled = true
  rules.no-unused-vars = "error"
  # Would guess src/ paths
  ```

  After:

  ```toml
  [code.linting.eslint]
  enabled = true
  files = ["src/**/*.ts"]  # Required when using rules
  rules.no-unused-vars = "error"
  ```

  This removes the hard-coded `src/` path guessing and makes the configuration explicit. Projects must now specify their file patterns.

## 0.13.1

### Patch Changes

- a09220b: Add e2e tests for ESLint rules audit feature

  - Added 4 e2e test fixtures for ESLint rules audit scenarios
  - Tests cover: rules matching, missing rules, wrong severity, multiple violations

## 0.13.0

### Minor Changes

- d7f1e9c: Add ESLint rules audit to `cm code audit` command

  - Added `rules` option to ESLint config in check.toml schema
  - `cm code audit` now verifies that ESLint rules match the required rules from check.toml
  - Uses `eslint --print-config` to get effective config and compare severities
  - Registry maintainers can now enforce ESLint rule standards across projects

## 0.12.0

### Minor Changes

- 73af2d5: Add granular ESLint configuration options to check.toml schema:
  - `files` - array of glob patterns for files to lint
  - `ignore` - array of glob patterns to ignore
  - `max-warnings` - max number of warnings before failure

## 0.11.0

### Minor Changes

- 5428090: Add `cm schema config` command to output JSON schema for check.toml configuration. This allows AI agents and IDEs to understand the configuration structure.

## 0.10.4

### Patch Changes

- 319e995: Remove prompts validation from `cm validate registry` command. The command now only validates rulesets/\*.toml files, as prompts are no longer a core feature of the registry.

## 0.10.3

### Patch Changes

- eb26008: Bug fixes:

  - **pip-audit**: Now uses `-r requirements.txt` to audit project dependencies instead of the current environment
  - **Registry timeout**: Git clone now has a 30-second timeout to prevent hanging on network issues
  - **README**: Fixed incorrect config format in documentation examples

## 0.10.2

### Patch Changes

- 28f27f9: Fix naming config being dropped when using extends registry

## 0.10.1

### Patch Changes

- 2bbffc0: Fix bugs in v0.8.0+ features:

  - **Config Validation**: `cm validate config` now validates extends registry paths and ruleset references exist
  - **Skip Messages**: Improved clarity by showing actual missing file names (e.g., "package-lock.json not found" instead of "No npmaudit config found")

## 0.10.0

### Minor Changes

- c6441a4: Add naming conventions validation for file and folder names.

  Features:

  - Support for kebab-case, snake_case, camelCase, PascalCase
  - Configure rules per file extension (e.g., .ts, .py, .tsx)
  - Validates both file names and containing folder names
  - Skips special files like **init**.py and \_internal.py

  Example configuration:

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
  ```

## 0.9.0

### Minor Changes

- af31ddf: Add config value auditing for tsconfig.json

  **Config Audit (`cm code audit`):**

  - Audit tsconfig.json compiler options against expected values from check.toml
  - Support `[code.types.tsc.require]` section to specify required compiler options
  - Reports violations with "expected X, got Y" messages for mismatched values
  - Reports "expected X, got missing" for options that aren't set

  Example check.toml:

  ```toml
  [code.types.tsc]
  enabled = true

  [code.types.tsc.require]
  strict = true
  noImplicitAny = true
  esModuleInterop = true
  ```

## 0.8.0

### Minor Changes

- d552bdb: Add registry validation and extends functionality

  **Registry Validation (`cm validate registry`):**

  - Validates registry structure with `rulesets/*.toml` and `prompts/*.md`
  - Checks all TOML files conform to check.toml schema
  - Checks all prompt files have `.md` extension

  **Registry Extends (`[extends]` in check.toml):**

  - Extend configuration from remote registries
  - Support GitHub (`github:owner/repo` or `github:owner/repo@ref`) and local paths
  - Merge multiple rulesets in order with local overrides
  - Cache GitHub repositories in `/tmp/cm-registry-cache/`

  **Command changes:**

  - `cm validate` → `cm validate config` (validate check.toml)
  - `cm validate registry` (new - validate registry structure)

  Example check.toml with extends:

  ```toml
  [extends]
  registry = "github:chrismlittle123/check-my-toolkit-registry-community"
  rulesets = ["typescript-internal"]

  [code.linting.eslint]
  enabled = true
  ```

## 0.7.6

### Patch Changes

- 505186a: Fix bugs reported in v0.7.5:

  - Remove process and stack domains from schema (not implemented, were misleading)
  - Fix ty audit false positive: now properly checks for [tool.ty] section in pyproject.toml instead of just checking if pyproject.toml exists
  - Fix tests audit performance: use iterator with early termination to avoid scanning all files

## 0.7.5

### Patch Changes

- fa27a12: Fix multiple bugs reported in v0.7.4:

  - Fix VERSION constant to read dynamically from package.json instead of hardcoded value
  - Update CLI description to accurately reflect current functionality (code quality only)
  - Remove TSC compiler options from schema (cannot override tsconfig.json via CLI)
  - Remove unimplemented code.complexity schema
  - Remove unimplemented code.files schema
  - Use Promise.allSettled for parallel tool execution to prevent one failing tool from losing all results

## 0.7.4

### Patch Changes

- 20580f5: Add configuration support for Ruff and TSC from check.toml. Ruff now accepts line-length, lint.select, and lint.ignore options. TSC now accepts strict mode and other compiler flags. Removed ESLint rules from schema as ESLint flat config doesn't support CLI rule overrides.

## 0.7.3

### Patch Changes

- 1069d80: Fix multiple reported bugs:

  - Fix VERSION constant mismatch (was showing 0.2.0 instead of 0.7.2)
  - Detect and report broken symlinks for check.toml instead of silently ignoring
  - Handle tsc not installed error with clean message instead of garbled ANSI output
  - Fix gitleaks audit to fail on non-install errors instead of returning pass
  - Show just filename when line/column are undefined instead of misleading :0:0
  - Improve pip-audit to detect actual dependency file instead of always reporting requirements.txt

## 0.7.2

### Patch Changes

- 3645e6a: Add comprehensive ruff test coverage to prevent regression of violation detection

## 0.7.1

### Patch Changes

- 5011869: Fix validation and tool detection bugs

  - Add strict mode to all Zod schemas to reject unknown configuration keys
  - Add --format option validation with choices (text, json)
  - Fix ruff/vulture binary detection when not installed (now correctly reports "skipped")
  - Add Brewfile for development dependencies (Python 3.13, ruff, vulture)

## 0.7.0

### Minor Changes

- b0a3aac: Add Gitleaks integration for hardcoded secrets detection, completing v0.3 security features.

  - New `[code.security.secrets]` configuration option
  - Detects hardcoded secrets using Gitleaks
  - Skips gracefully when Gitleaks is not installed
  - Reports findings with file/line information

## 0.6.0

### Minor Changes

- 3db15bc: Add ty Python type checker integration (`[code.types.ty]`). ty is Astral's extremely fast Python type checker written in Rust. Enable with `[code.types.ty] enabled = true` to check Python code for type errors.

## 0.5.0

### Minor Changes

- 78a0070: Add tests validation feature (`[code.tests]`) that checks for the existence of test files matching a configurable glob pattern. Supports custom patterns and minimum test file requirements.

## 0.4.0

### Minor Changes

- b0e48ff: Add Prettier formatting check support. Enable with `[code.formatting.prettier] enabled = true` to check JavaScript/TypeScript code formatting using `prettier --check`.

## 0.3.0

### Minor Changes

- 4ea0f7f: Add Ruff format checking support. Enable with `format = true` in `[code.linting.ruff]` to check Python code formatting using `ruff format --check`.

## 0.2.1

### Patch Changes

- 6a01bb0: Add Vulture integration for Python dead code detection

  - New `[code.unused.vulture]` configuration option
  - Detects unused functions, classes, variables, imports, methods, attributes, and unreachable code
  - Supports Vulture 2.9+ (uses exit code 3 for dead code found)
  - Skips gracefully when Vulture is not installed

## 0.2.0

### Minor Changes

- 021eda7: Add Knip integration for unused code detection

  - Add `[code.unused.knip]` configuration section
  - Detect unused files, dependencies, exports, and types
  - Support for unlisted dependencies and unresolved imports
  - 24 unit tests and 4 e2e tests for comprehensive coverage

## 0.1.2

### Patch Changes

- f571e5b: Add top-level CLI commands and colored output

  - Add `cm check` as alias for `cm code check` (runs all domain checks)
  - Add `cm audit` as alias for `cm code audit` (verifies all configs exist)
  - Add `cm init` to create check.toml with default configuration
  - Add colored terminal output using chalk for better readability
  - Add `cm validate` to validate check.toml configuration file

## 0.1.1

### Patch Changes

- cadb4ff: Add CI/CD workflows and improve documentation

  - Add GitHub Actions CI workflow for testing across Node 18, 20, 22
  - Add release workflow with changesets for automated npm publishing
  - Add PR checks workflow for branch naming and changelog reminders
  - Add pull request template
  - Add CHANGELOG.md following Keep a Changelog format
  - Improve README.md with installation, usage, and configuration docs
  - Add missing npm scripts: typecheck, test:e2e, version
  - Add @changesets/cli dependency

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- VERSION constant mismatch (was showing 0.2.0 instead of actual version)
- Detect and report broken symlinks for check.toml instead of silently ignoring
- Handle tsc not installed error with clean message instead of garbled ANSI output
- Fix gitleaks audit to fail on non-install errors instead of returning pass
- Show just filename when line/column are undefined instead of misleading :0:0
- Improve pip-audit to detect actual dependency file instead of always reporting requirements.txt

### Added

- Knip integration for unused code detection (`[code.unused.knip]`)
  - Detect unused files, dependencies, exports, and types
  - Support for unlisted dependencies and unresolved imports

## [0.1.0] - 2025-12-23

### Added

- Initial release of check-my-toolkit
- `cm code check` - Run linting (ESLint, Ruff) and type checking (tsc)
- `cm code audit` - Verify linting and type checking configs exist
- `cm validate` - Validate check.toml configuration file
- Configuration via `check.toml` with Zod validation
- Support for TypeScript (ESLint, tsc) and Python (Ruff) projects
- JSON output format via `--format json` flag
- Automatic config file discovery (walks up directory tree)

### Technical

- Built with Commander.js for CLI
- Uses execa for tool execution
- TOML parsing via @iarna/toml
- Configuration validation with Zod

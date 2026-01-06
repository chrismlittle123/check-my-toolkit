# Changelog

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

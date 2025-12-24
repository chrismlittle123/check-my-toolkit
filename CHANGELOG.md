# Changelog

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

# Changelog

## 0.34.1

### Patch Changes

- b9d7ecf: Add e2e tests for coverage_run, required_dir, and protected_branches features. Fix bug in config loader where coverage_run was not being merged with defaults.

## 0.34.0

### Minor Changes

- 446a2c0: Add protected branch push prevention hook validation

  - Add `protected_branches` config option to `process.hooks` section
  - Validates that pre-push hook exists when protected branches are configured
  - Verifies hook contains branch detection logic (git rev-parse, git branch --show-current, etc.)
  - Verifies hook checks for each configured protected branch name
  - Works for both single repos and monorepos

## 0.33.0

### Minor Changes

- caae2d2: Add test location validation with `required_dir` option

  - Add `required_dir` config option to `code.tests` section
  - Validates that the required directory exists
  - Scopes test file search to only the required directory
  - Clear error messages when directory is missing or empty
  - Works for both single repos and monorepos (per-package check.toml)

## 0.32.0

### Minor Changes

- 172bb1f: Add test coverage verification feature (`code.coverage_run`)

  - Runs actual test suite with coverage during `cm code check`
  - Supports vitest, jest, and pytest (auto-detected or configurable)
  - Verifies coverage meets a configurable minimum threshold (default 80%)
  - Supports custom test commands via `command` option
  - Parses coverage reports from common formats (coverage-summary.json, coverage-final.json, pytest-cov)

## 0.31.0

### Minor Changes

- bf7fec7: Add monorepo support with `--monorepo` flag for `cm check` command. Detects all projects in a monorepo and runs checks in each project that has a check.toml config, then aggregates results with per-project status and total summary.

## 0.30.1

### Patch Changes

- 7935b05: Improve CLI test performance by importing module once instead of on every test

## 0.30.0

### Minor Changes

- f08b2f9: Add CODEOWNERS validation with registry inheritance

  - New `[process.codeowners]` config section for defining required CODEOWNERS rules
  - Validates CODEOWNERS file contains all configured rules with exact owner match
  - Fails if CODEOWNERS has rules not defined in config
  - Rules from registry and project config are merged (project can override same pattern)
  - Supports standard CODEOWNERS locations: `.github/CODEOWNERS`, `CODEOWNERS`, `docs/CODEOWNERS`

## 0.29.1

### Patch Changes

- 78f6d89: Dogfood hook commands in project's own git hooks

  - Add commit-msg hook using `cm process check-commit`
  - Add check-branch to pre-push hook
  - Update check.toml to require these hooks

## 0.29.0

### Minor Changes

- ea95bfb: Add hook-specific commands for git workflow validation

  - `cm process check-branch` - Validates current branch name against configured pattern (for pre-push hooks)
  - `cm process check-commit <file>` - Validates commit message format and ticket references (for commit-msg hooks)

  Both commands support `--quiet` mode for minimal output in hooks and use the same configuration from check.toml, enabling defense-in-depth with identical rules enforced locally and in CI.

## 0.28.3

### Patch Changes

- 1f13593: Run only unit tests in pre-push hook, E2E tests run in CI only

## 0.28.2

### Patch Changes

- 26a348c: fix: support comma-separated patterns in test file validation

  The test file pattern option now correctly handles comma-separated patterns like
  `**/*.{test,spec}.ts,**/test_*.py`. The patterns are split at top-level commas
  while preserving brace syntax (commas inside braces like `{test,spec}` are kept).

  Fixes BUG-001.

## 0.28.1

### Patch Changes

- 22d05fa: Fix missing yaml dependency error - the published v0.28.0 incorrectly imported `yaml` instead of `js-yaml` in process tools

## 0.28.0

### Minor Changes

- ad3c045: Add infra.tagging for AWS resource tag validation

  New INFRA domain with AWS resource tagging enforcement:

  - Uses AWS Resource Groups Tagging API to verify resources have required tags
  - Supports allowed values validation for specific tags
  - New CLI commands: `cm infra check` and `cm infra audit`
  - Configurable region and tag requirements in check.toml

## 0.27.0

### Minor Changes

- 3a61bba: Add `[process.backups]` for S3 backup verification

  - Verify backups exist at configured S3 location
  - Check most recent backup is within `max_age_hours` threshold
  - Configuration: `bucket`, `prefix`, `max_age_hours`, `region`
  - Uses AWS SDK v3 with `@aws-sdk/client-s3`
  - Unit tests with `aws-sdk-client-mock`

## 0.26.0

### Minor Changes

- 87f9cdc: Add `cm process diff` and `cm process sync` commands for GitHub branch protection synchronization

  - `cm process diff` shows differences between current GitHub settings and check.toml config
  - `cm process sync` previews changes (requires `--apply` flag to actually apply)
  - Supports configuring: required_reviews, dismiss_stale_reviews, require_code_owner_reviews, require_status_checks, require_branches_up_to_date, require_signed_commits, enforce_admins

## 0.25.0

### Minor Changes

- 8554c96: Add `[process.repo]` for repository settings validation. Checks branch protection rules and CODEOWNERS file via GitHub API.

## 0.24.0

### Minor Changes

- c82ca9e: Add `process.coverage` rule to enforce coverage thresholds are configured. Supports vitest, jest, and nyc/istanbul configs. Can check config files, CI workflows, or both.
- 4d695e5: Add `cm projects detect` command for monorepo project discovery. Detects TypeScript, Python, Rust, and Go projects by marker files, shows which have check.toml configs, and can create missing configs with `--fix`.

### Patch Changes

- 3468342: Add INFRA domain roadmap documenting infrastructure as code validation and live infrastructure verification features.

## 0.23.0

### Minor Changes

- 2cb2fc2: Add process.tickets feature for commit message ticket reference validation

  - Validates commit messages contain ticket references matching a pattern
  - Optionally validates branch names contain ticket references
  - Configuration: `[process.tickets]` with `pattern`, `require_in_commits`, `require_in_branch`

## 0.22.0

### Minor Changes

- ba6577f: Add process.pr feature for PR size validation

  - New `[process.pr]` configuration to enforce PR size limits
  - `max_files`: Maximum number of files changed in a PR
  - `max_lines`: Maximum total lines changed (additions + deletions)
  - Reads PR data from `GITHUB_EVENT_PATH` environment variable (GitHub Actions context)
  - Skips gracefully when not in a PR context
  - Includes 23 unit tests and 5 e2e tests with mock event payloads

## 0.21.0

### Minor Changes

- 0359fd5: Add process.branches validation for branch naming conventions

  - Validate current branch name against a regex pattern
  - Support exclude list for branches like main/master/develop
  - Uses git CLI for universal compatibility (works with any git host)

## 0.20.0

### Minor Changes

- e100771: Add process.ci validation for GitHub Actions workflows

  - Check that required workflow files exist in `.github/workflows/`
  - Validate required jobs exist in workflow YAML files
  - Validate required actions are used in workflow steps
  - New configuration options: `require_workflows`, `jobs`, `actions`

## 0.19.0

### Minor Changes

- 170d01b: feat: add process domain with git hooks validation

  Introduces the PROCESS domain for workflow enforcement, starting with git hooks validation:

  **New Features:**

  - `cm process check` - Run workflow validation (hooks, CI, etc.)
  - `cm process audit` - Verify workflow configs exist
  - `cm check` now runs both CODE and PROCESS domains

  **Git Hooks Configuration (`[process.hooks]`):**

  - `require_husky` - Verify .husky/ directory exists
  - `require_hooks` - List of required hook files (e.g., pre-commit, pre-push)
  - `commands` - Verify hooks contain specific commands

  **Example Configuration:**

  ```toml
  [process.hooks]
  enabled = true
  require_husky = true
  require_hooks = ["pre-commit", "pre-push"]

  [process.hooks.commands]
  pre-commit = ["lint-staged"]
  pre-push = ["npm test"]
  ```

  **Violations Detected:**

  - Missing husky installation
  - Missing required hook files
  - Hook files missing required commands

## 0.18.0

### Minor Changes

- 1fd3b50: feat: add disable-comments check to detect linter disable comments

  New check under `[code.quality.disable-comments]` that detects and reports disable comments across multiple linters:

  **Default patterns detected:**

  - ESLint: `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line`
  - TypeScript: `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`
  - Python: `# noqa`, `# type: ignore`, `# pylint: disable`, `# pragma: no cover`
  - Prettier: `prettier-ignore`

  **Configuration options:**

  - `patterns` - Override default patterns to detect
  - `extensions` - File extensions to scan (default: ts, tsx, js, jsx, py)
  - `exclude` - Glob patterns to exclude from scanning

  Example usage:

  ```toml
  [code.quality.disable-comments]
  enabled = true
  exclude = ["tests/**"]
  ```

## 0.17.1

### Patch Changes

- d667914: fix: documentation and schema validation bugs

  - **README.md**: Fixed incorrect config names in documentation

    - `[code.security.gitleaks]` → `[code.security.secrets]`
    - `[code.security.npm-audit]` → `[code.security.npmaudit]`
    - `[code.security.pip-audit]` → `[code.security.pipaudit]`
    - `cm validate` → `cm validate config`
    - Fixed naming conventions example to use correct `[[code.naming.rules]]` array syntax

  - **Schema**: Changed `min_test_files` from `.positive()` to `.nonnegative()` to allow 0

- d667914: fix: resolve three real bugs

  - Fix numeric filenames (e.g., 404.tsx, 500.tsx) failing naming validation - common for Next.js error pages
  - Fix tsconfig.json with comments (JSONC) failing to parse during audit
  - Fix gitleaks custom config files (.gitleaks.toml, gitleaks.toml) being ignored

## 0.17.0

### Minor Changes

- 5253124: feat: add pnpm support for dependency audit

  - Auto-detect package manager by checking for lock files (pnpm-lock.yaml, package-lock.json)
  - Run appropriate audit command (`pnpm audit` or `npm audit`) based on detected package manager
  - Parse both npm and pnpm audit output formats
  - Updated error messages to reflect multi-package-manager support

## 0.16.0

### Minor Changes

- 5979b38: feat: add 8 high-value ESLint rules for bug prevention

  Added eslint-plugin-import and configured 8 high-signal rules that catch real bugs:

  **Bug Prevention:**

  - `import/no-cycle` - Detect circular dependencies (architecture rot)
  - `array-callback-return` - Catch missing returns in .map(), .filter(), etc.
  - `no-template-curly-in-string` - Catch wrong quotes on template literals
  - `consistent-return` - Ensure consistent function return behavior
  - `@typescript-eslint/no-unnecessary-condition` - Catch dead code and logic errors
  - `@typescript-eslint/switch-exhaustiveness-check` - Ensure all union cases are handled
  - `@typescript-eslint/no-non-null-assertion` - Prevent false confidence from ! assertions

  **Code Quality:**

  - `max-params` - Force better function design (max 4 parameters)

  All rules are now audited via `cm code audit` to ensure eslint.config.js matches requirements.

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

- **README.md**: Fixed incorrect config names in documentation
  - `[code.security.gitleaks]` → `[code.security.secrets]`
  - `[code.security.npm-audit]` → `[code.security.npmaudit]`
  - `[code.security.pip-audit]` → `[code.security.pipaudit]`
  - `cm validate` → `cm validate config`
  - Fixed naming conventions example to use correct `[[code.naming.rules]]` array syntax
- **Schema**: Changed `min_test_files` from `.positive()` to `.nonnegative()` to allow 0

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

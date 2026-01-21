# Changelog

## 1.9.2

### Patch Changes

- 32b1857: fix: batch bug fixes for issues #113, #118, #119
  - CODEOWNERS validation now enforces owner order (#113)
  - CI action extraction properly handles Docker, local, and SHA references (#118)
  - `cm validate config --verbose` now shows when project rules override registry rules (#119)

## 1.9.1

### Patch Changes

- c3dd4e8: docs: clarify check.toml configuration philosophy and Gitleaks custom rules
  - Add "Configuration Philosophy" section explaining that check.toml is the source of truth for lint rules
  - Add note to Ruff section clarifying that ruff.toml rules are not used by cm code check
  - Update Gitleaks documentation with what is/isn't detected by default
  - Add example for custom Gitleaks rules via .gitleaks.toml

  Closes #130

## 1.9.0

### Minor Changes

- f4744b0: feat(process): add exclude option for PR size limits

  Added `exclude` option to `[process.pr]` configuration to exclude files from PR size calculations. This is useful for excluding auto-generated files like lock files and snapshots.

  ```toml
  [process.pr]
  enabled = true
  max_files = 20
  max_lines = 500
  exclude = ["*-lock.json", "*-lock.yaml", "**/*.snap"]
  ```

  When exclude patterns are configured, the tool fetches the PR file list from GitHub API and filters out matching files before calculating counts. Falls back to aggregate counts if the API is unavailable.

  Closes #188

## 1.8.1

### Patch Changes

- a491d1d: Fix multiple bugs:
  - fix(config): reject naming rules with empty extensions array (#182)
  - fix(cli): return exit code 2 for invalid --format argument (#179)
  - fix(process): report error for non-existent workflow files in ci.commands (#177)
  - fix(process): handle boolean `if: true` in CI workflow checks (#176)
  - fix(process): use min_threshold from check.toml as valid coverage config (#187)

## 1.8.0

### Minor Changes

- e261ba4: Add `cm process scan --repo` command for remote repository validation
  - New command to scan GitHub repository settings via API without cloning
  - Validates branch protection rulesets, tag protection, and required files
  - Supports `--repo owner/repo` format and JSON output
  - Exports `validateProcess()` programmatic API for drift-toolkit integration

## 1.7.0

### Minor Changes

- 26e7918: Complete GitHub Rulesets migration (Issue #163)

  **New Features:**
  - Rename config from `[process.repo.branch_protection]` to `[process.repo.ruleset]`
  - Add `name` and `enforcement` fields to ruleset configuration
  - Add bypass actor validation with `--validate-actors` flag
  - Add cleanup commands: `cm process list-rules` and `cm process cleanup-rules`

  **Migration:**
  - `[process.repo.branch_protection]` is now deprecated (still works in v1.x)
  - Use `[process.repo.ruleset]` instead
  - See `docs/MIGRATION.md` for migration guide

  **New CLI Commands:**
  - `cm process list-rules` - List all protection rules (classic + rulesets)
  - `cm process cleanup-rules [--apply]` - Remove orphaned classic branch protection
  - `cm process sync --validate-actors` - Validate bypass actors before applying

## 1.6.0

### Minor Changes

- 336d91b: Add `[process.ci.commands]` configuration to enforce that specific shell commands run unconditionally in CI workflows on PRs to main.

  Features:
  - Workflow-level commands: require commands anywhere in workflow
  - Job-level commands: require commands in specific jobs
  - Validates workflow triggers on pull_request/push to main
  - Detects conditional execution (job/step `if:` conditions)
  - Detects commented-out commands
  - Substring matching for flexible command detection

## 1.5.7

### Patch Changes

- f9e505d: Fix CLI exit codes and add configurable forbidden_files ignore patterns
  - CLI now returns exit code 2 (CONFIG_ERROR) for invalid arguments like `-f invalid`
  - Added `ignore` option to `[process.forbidden_files]` config to customize which directories to skip during scans (defaults to `node_modules/` and `.git/`)

## 1.5.6

### Patch Changes

- 6796ba9: Fix duplicate extension validation and block comment detection
  - Add schema validation to reject duplicate extensions across naming rules (#140)
  - Detect disable patterns in block comments (`/* */`) in addition to line comments (#138)

## 1.5.5

### Patch Changes

- 8e0932a: Fix tier validation bugs and improve error messages
  - #147: Export VALID_TIERS constant for use by other packages
  - #151: Fix repo-metadata.yaml lookup to use git root instead of config directory
  - #156: Show warning when repo-metadata.yaml has YAML parse errors
  - #158: Distinguish between missing, empty, and invalid repo-metadata.yaml files
  - #159: Warn when extends.registry is configured but rulesets is empty
  - #161: Show valid tier options when an invalid tier value is used
  - #162: Add glob pattern validation for forbidden_files configuration

## 1.5.4

### Patch Changes

- 4d13442: Fix forbidden_files configuration not being merged with defaults

  The `[process.forbidden_files]` feature was completely non-functional because the
  `mergeProcess()` function in `config/loader.ts` did not include `forbidden_files`
  in its merge logic. The configuration was parsed and validated but never passed
  to the runner.

  This fix adds `forbidden_files` to the merge process, making the feature work as
  intended.

## 1.5.3

### Patch Changes

- c1473f7: Re-enable community registry (typescript-internal ruleset) in check.toml

## 1.5.2

### Patch Changes

- e1e7474: Fix sync applier to always include `enforce_admins` field (required by GitHub API), defaulting to `false` so CI/release workflows can merge to protected branches.

## 1.5.1

### Patch Changes

- 0102eeb: Remove array-format ESLint rule support from check.toml schema due to TOML limitation (arrays cannot mix strings and inline tables). Complex rules like `@typescript-eslint/naming-convention` must be configured directly in eslint.config.js.

## 1.5.0

### Minor Changes

- 5eafad7: Support array-format ESLint rules in check.toml schema, enabling complex rules like `@typescript-eslint/naming-convention`
- 5b7207b: Add `@typescript-eslint/naming-convention` rules to enforce consistent naming in TypeScript code:
  - Enum members must be UPPER_CASE
  - Types must be PascalCase
  - Variables: camelCase, UPPER_CASE, or PascalCase
  - Functions and class methods: camelCase

## 1.4.0

### Minor Changes

- 470f1cb: Add `[process.forbidden_files]` configuration to enforce that certain files must NOT exist in the repository. This is useful for detecting anti-patterns like `.env` files that should use secrets management instead.

## 1.3.1

### Patch Changes

- 38263d1: Fix 12 bugs across CODE and PROCESS domains

  CODE domain fixes:
  - Add duplicate extension validation in schema (#127)
  - Handle undefined exitCode in coverage-run (#125)
  - Add vulture exclusion patterns for virtual environments (#123)
  - Deduplicate extensions in glob patterns (#122)
  - Add symlink detection in ruff and ty tools (#124)
  - Add comment-aware pattern detection to avoid false positives (#128)

  PROCESS domain fixes:
  - Use non-greedy scope regex in commits (#116)
  - Add word boundary to issue reference regex (#115)
  - Split frontmatter delimiter error messages (#120)
  - Report malformed CODEOWNERS lines as violations (#114)
  - Report YAML parse errors in CI checks (#107)
  - Generate dynamic branch examples from config (#121)

- 734b549: Fix inconsistent projectRoot vs process.cwd() usage in PROCESS domain
  - changesets.ts: Pass projectRoot to checkDirectoryExists() instead of using process.cwd()
  - changesets.ts: Pass projectRoot to checkChangesRequireChangeset() instead of using process.cwd()
  - check-branch.ts: Pass projectRoot to runBranchValidation() instead of using process.cwd()

  These fixes ensure consistent behavior when running from subdirectories or in monorepos.

- a63bc8a: Add comprehensive unit tests for process domain tools
  - commits.test.ts: 30 tests for conventional commit validation
  - docs-helpers.test.ts: 43 tests for markdown/export parsing helpers
  - changesets.test.ts: 39 tests for changeset format validation
  - docs.test.ts: 48 tests for documentation governance checks
  - infra-index.test.ts: 8 tests for infra domain orchestration

  Coverage improvements:
  - Overall: 77.33% → 85.79%
  - Process tools: 19.5% → 95.87%

## 1.3.0

### Minor Changes

- 25dfe44: Add `cm validate tier` command for validating tier-ruleset alignment
  - Validates that check.toml rulesets match the project tier from repo-metadata.yaml
  - Production tier requires `*-production` ruleset, internal requires `*-internal`, prototype requires `*-prototype`
  - Defaults to internal tier when repo-metadata.yaml is missing
  - Supports `--format json` for programmatic use
  - Exports `validateTierRuleset()` API for library consumers

## 1.2.0

### Minor Changes

- 413a43e: Add `cm dependencies` command for drift-toolkit integration
  - New CLI command: `cm dependencies` with `--format`, `--check`, `--project` options
  - Built-in dependency mappings for 12 tools (eslint, prettier, tsc, knip, vitest, pytest, etc.)
  - Support for custom dependencies via `dependencies = [...]` in check.toml tool configs
  - Always tracked files: check.toml, .github/workflows/\*.yml, repo-metadata.yaml
  - Programmatic API: `getDependencies()` exported for library use

## 1.1.2

### Patch Changes

- b4debd9: Enable prettier formatting for the codebase
- ffc25e9: Remove support for non-TypeScript/Python project types from project detection. The tool now focuses exclusively on TypeScript and Python tooling.

## 1.1.1

### Patch Changes

- 5a80f5a: Verify CI and release workflow after pnpmaudit changes

## 1.1.0

### Minor Changes

- 24bd7a1: Replace npmaudit with pnpmaudit and add exclude_dev option
  - Remove npm audit support, keep only pnpm audit
  - Add `exclude_dev` config option (default: true) to skip dev dependencies
  - Uses `--prod` flag when exclude_dev is enabled

## 1.0.1

### Patch Changes

- 2bd0701: Fix lint errors in process.docs implementation and make release workflow depend on CI success

## 1.0.0

### Major Changes

- 1c28cd4: feat: implement process.docs documentation governance

  Adds documentation governance feature to the PROCESS domain with:
  - Structure enforcement (allowlist, max_files, max_file_lines, max_total_kb)
  - Content validation (frontmatter, required sections, internal links)
  - Freshness tracking (git-based staleness detection)
  - API coverage (regex-based export detection with threshold)

## 0.37.1

### Patch Changes

- f827bdc: Remove unused exports flagged by knip
  - Remove unused export `CoverageRunRunner` from src/code/index.ts
  - Remove unused re-exports `detectProjects` and `DetectedProject` from src/projects/index.ts
  - Remove unused export `AuthMethod` from src/config/registry.ts

## 0.37.0

### Minor Changes

- d57bfc7: Remove --monorepo flag in favor of pnpm -r exec

  The `--monorepo` flag has been removed. For monorepo support, use pnpm's built-in workspace commands instead:

  ```bash
  # Run checks in all packages
  pnpm -r exec cm code check

  # Run checks in specific packages
  pnpm --filter "packages/*" exec cm code check
  ```

  This approach is simpler, more reliable, and properly respects each package's check.toml configuration.

## 0.36.0

### Minor Changes

- 55e8e6e: Remove redundant `code.tests` feature and optimize test workflow

  **Breaking Change**: The `[code.tests]` configuration is no longer supported. Use `[code.coverage_run]` instead, which actually runs tests and validates coverage thresholds.

  **Test workflow improvements**:
  - CI now runs unit and e2e tests as separate steps for better visibility
  - Pre-push hook no longer runs tests (faster local workflow)
  - Default `pnpm test` now runs only unit tests (~43s vs ~7min)

  New test scripts:
  - `pnpm test` - Unit tests only (fast, for local dev)
  - `pnpm test:watch` - Unit tests in watch mode
  - `pnpm test:e2e` - E2E tests only
  - `pnpm test:all` - All tests

## 0.35.1

### Patch Changes

- d58ab78: Sync documentation with implemented features: update roadmaps, fix tool count (15 not 14), add coverage_run docs, remove STACK domain references

## 0.35.0

### Minor Changes

- 0b41030: Add private registry support for configuration inheritance. You can now use private GitHub repositories as config registries:
  - **Token authentication**: Set `GITHUB_TOKEN` or `CM_REGISTRY_TOKEN` environment variable, or use `github+token:owner/repo` URL
  - **SSH authentication**: Use `github+ssh:owner/repo` URL or auto-detect via SSH agent (`SSH_AUTH_SOCK`)
  - **Auto-detection**: When using `github:owner/repo`, authentication method is automatically detected based on available credentials

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
- 4d695e5: Add `cm projects detect` command for monorepo project discovery. Detects TypeScript and Python projects by marker files, shows which have check.toml configs, and can create missing configs with `--fix`.

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

- 3db15bc: Add ty Python type checker integration (`[code.types.ty]`). ty is Astral's extremely fast Python type checker. Enable with `[code.types.ty] enabled = true` to check Python code for type errors.

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

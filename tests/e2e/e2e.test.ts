import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * E2E test suite for check-my-toolkit CLI
 *
 * Each test runs the CLI against a test project and verifies:
 * - Exit code matches expected
 * - Output contains expected patterns (violations, passes, etc.)
 */

interface TestCase {
  name: string;
  config: string;
  command: "check" | "audit" | "validate";
  domain?: "code" | "process"; // If not specified, uses "code" for backward compatibility
  format?: "text" | "json";
  env?: Record<string, string>; // Optional environment variables to set
  expectedExitCode: number;
  expectedPatterns: string[];
  notExpectedPatterns?: string[];
}

const testCases: TestCase[] = [
  // ============================================================
  // Linting: Violations expected
  // ============================================================
  {
    name: "default project with ESLint and Ruff violations",
    config: "tests/e2e/projects/default/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ ESLint:", "✗ Ruff:", "violation(s) found"],
  },
  {
    name: "typescript/default with ESLint violation",
    config: "tests/e2e/projects/typescript/default/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ ESLint:", "no-var"],
  },
  {
    name: "typescript/multi-violations with multiple ESLint errors",
    config: "tests/e2e/projects/typescript/multi-violations/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ ESLint: 9 violation(s)", "no-var", "prefer-const", "eqeqeq"],
  },
  {
    name: "typescript/nested-dirs finds violations in subdirectories",
    config: "tests/e2e/projects/typescript/nested-dirs/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ ESLint: 2 violation(s)", "lib/legacy.ts", "src/utils/helpers.ts"],
  },
  {
    name: "typescript/special-chars handles special filenames",
    config: "tests/e2e/projects/typescript/special-chars/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["file-with-dashes.ts", "file.multiple.dots.ts", "file_with_underscores.ts"],
  },
  {
    name: "python/default with Ruff violations",
    config: "tests/e2e/projects/python/default/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ Ruff:", "F401", "imported but unused"],
  },
  {
    name: "python/multi-violations detects violations across files",
    config: "tests/e2e/projects/python/multi-violations/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ Ruff:", "F401", "main.py", "src/utils.py"],
  },

  // ============================================================
  // Linting: Should pass
  // ============================================================
  {
    name: "typescript/clean-project passes all checks",
    config: "tests/e2e/projects/typescript/clean-project/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["✓ ESLint: passed", "✓ All checks passed"],
  },
  {
    name: "typescript/without-tsc passes when tsc disabled",
    config: "tests/e2e/projects/typescript/without-tsc/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["✓ ESLint: passed"],
    notExpectedPatterns: ["TypeScript"],
  },

  // ============================================================
  // Tools disabled
  // ============================================================
  {
    name: "typescript/with-tools-disabled skips ESLint when disabled",
    config: "tests/e2e/projects/typescript/with-tools-disabled/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["○ CODE", "✓ All checks passed"],
    notExpectedPatterns: ["ESLint"],
  },
  {
    name: "python/with-tools-disabled skips Ruff when disabled",
    config: "tests/e2e/projects/python/with-tools-disabled/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["○ CODE", "✓ All checks passed"],
    notExpectedPatterns: ["Ruff"],
  },
  {
    name: "mixed-extensions with both linters disabled",
    config: "tests/e2e/projects/mixed-extensions/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["○ CODE"],
  },

  // ============================================================
  // TypeScript type checking
  // ============================================================
  {
    name: "typescript/with-tsc-enabled catches type errors",
    config: "tests/e2e/projects/typescript/with-tsc-enabled/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ TypeScript:", "TS2345"],
  },

  // ============================================================
  // Empty/missing configs
  // ============================================================
  {
    name: "typescript/empty-project fails when no ESLint config",
    config: "tests/e2e/projects/typescript/empty-project/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ ESLint:", "Config not found"],
  },
  {
    name: "config-errors/missing-name handles missing project name",
    config: "tests/e2e/projects/config-errors/missing-name/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["✓ All checks passed"],
  },

  // ============================================================
  // Config errors
  // ============================================================
  {
    name: "config-errors/invalid-toml rejects invalid TOML",
    config: "tests/e2e/projects/config-errors/invalid-toml/check.toml",
    command: "validate",
    expectedExitCode: 2,
    expectedPatterns: ["✗ Invalid:", "Failed to parse"],
  },
  {
    name: "config-errors/broken-eslint reports ESLint config error",
    config: "tests/e2e/projects/config-errors/broken-eslint/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["ESLint error"],
  },

  // ============================================================
  // Audit command
  // ============================================================
  {
    name: "audit finds missing Ruff config",
    config: "tests/e2e/projects/typescript/default/check.toml",
    command: "audit",
    expectedExitCode: 1,
    expectedPatterns: ["✗ Ruff Config:", "Ruff config not found"],
  },
  {
    name: "audit passes when ESLint config exists",
    config: "tests/e2e/projects/audit-warnings/eslint-mismatch/check.toml",
    command: "audit",
    expectedExitCode: 0,
    expectedPatterns: ["✓ ESLint Config: passed"],
  },

  // ============================================================
  // ESLint Rules Audit
  // ============================================================
  {
    name: "eslint-rules/pass audit passes when rules match",
    config: "tests/e2e/projects/eslint-rules/pass/check.toml",
    command: "audit",
    expectedExitCode: 0,
    expectedPatterns: ["✓ ESLint Config: passed"],
  },
  {
    name: "eslint-rules/missing-rule audit fails when rule not configured",
    config: "tests/e2e/projects/eslint-rules/missing-rule/check.toml",
    command: "audit",
    expectedExitCode: 1,
    expectedPatterns: ["✗ ESLint Config:", "eqeqeq", "required but not configured"],
  },
  {
    name: "eslint-rules/wrong-severity audit fails when severity mismatch",
    config: "tests/e2e/projects/eslint-rules/wrong-severity/check.toml",
    command: "audit",
    expectedExitCode: 1,
    expectedPatterns: ["✗ ESLint Config:", "no-unused-vars", 'expected "error"', 'got "warn"'],
  },
  {
    name: "eslint-rules/multiple-violations audit reports all violations",
    config: "tests/e2e/projects/eslint-rules/multiple-violations/check.toml",
    command: "audit",
    expectedExitCode: 1,
    expectedPatterns: [
      "✗ ESLint Config:",
      "semi",
      'expected "error"',
      "eqeqeq",
      "no-console",
      "required but not configured",
    ],
  },

  // ============================================================
  // Validate command
  // ============================================================
  {
    name: "validate accepts valid config",
    config: "tests/e2e/projects/typescript/clean-project/check.toml",
    command: "validate",
    expectedExitCode: 0,
    expectedPatterns: ["✓ Valid:"],
  },

  // ============================================================
  // Complexity limits (not implemented yet - should skip)
  // ============================================================
  {
    name: "limits-file-lines skips (not implemented)",
    config: "tests/e2e/projects/limits-file-lines/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["○ CODE"],
  },
  {
    name: "limits-function-lines skips (not implemented)",
    config: "tests/e2e/projects/limits-function-lines/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["○ CODE"],
  },
  {
    name: "limits-nesting skips (not implemented)",
    config: "tests/e2e/projects/limits-nesting/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["○ CODE"],
  },
  {
    name: "limits-parameters skips (not implemented)",
    config: "tests/e2e/projects/limits-parameters/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["○ CODE"],
  },
  {
    name: "limits-pass skips (not implemented)",
    config: "tests/e2e/projects/limits-pass/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["○ CODE"],
  },
  {
    name: "limits-skip skips (not implemented)",
    config: "tests/e2e/projects/limits-skip/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["○ CODE"],
  },

  // ============================================================
  // Requirements (files check not implemented yet)
  // ============================================================
  {
    name: "requirements-skip with no linters",
    config: "tests/e2e/projects/requirements-skip/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["○ CODE"],
  },
  {
    name: "requirements-missing-files with no linters",
    config: "tests/e2e/projects/requirements-missing-files/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["○ CODE"],
  },
  {
    name: "requirements-pass with no linters",
    config: "tests/e2e/projects/requirements-pass/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["○ CODE"],
  },
  {
    name: "requirements-missing-tools with no linters",
    config: "tests/e2e/projects/requirements-missing-tools/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["○ CODE"],
  },

  // ============================================================
  // Additional edge cases
  // ============================================================
  {
    name: "typescript/symlinks handles symlinks",
    config: "tests/e2e/projects/typescript/symlinks/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ ESLint:", "actual.ts"],
  },
  {
    name: "typescript/with-ignored-dirs finds violations",
    config: "tests/e2e/projects/typescript/with-ignored-dirs/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ ESLint:"],
  },
  {
    name: "typescript/with-files-config runs ESLint",
    config: "tests/e2e/projects/typescript/with-files-config/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ ESLint:"],
  },

  // ============================================================
  // JSON output format
  // ============================================================
  {
    name: "check with JSON output format",
    config: "tests/e2e/projects/typescript/default/check.toml",
    command: "check",
    format: "json",
    expectedExitCode: 1,
    expectedPatterns: ['"version":', '"domains":', '"code":', '"violations":'],
  },
  {
    name: "validate with JSON output format - valid",
    config: "tests/e2e/projects/typescript/clean-project/check.toml",
    command: "validate",
    format: "json",
    expectedExitCode: 0,
    expectedPatterns: ['"valid": true', '"configPath":'],
  },
  {
    name: "validate with JSON output format - invalid",
    config: "tests/e2e/projects/config-errors/invalid-toml/check.toml",
    command: "validate",
    format: "json",
    expectedExitCode: 2,
    expectedPatterns: ['"valid": false', '"error":'],
  },
  {
    name: "audit with JSON output format",
    config: "tests/e2e/projects/typescript/clean-project/check.toml",
    command: "audit",
    format: "json",
    expectedExitCode: 0,
    expectedPatterns: ['"version":', '"domains":', '"summary":'],
  },

  // ============================================================
  // Python clean project
  // ============================================================
  {
    name: "python/clean-project passes Ruff checks",
    config: "tests/e2e/projects/python/clean-project/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["✓ Ruff: passed", "✓ All checks passed"],
  },

  // ============================================================
  // Mixed TypeScript + Python project
  // ============================================================
  {
    name: "mixed-ts-python catches violations in both languages",
    config: "tests/e2e/projects/mixed-ts-python/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ ESLint:", "✗ Ruff:", "no-var", "F401"],
  },

  // ============================================================
  // TypeScript type checking - clean
  // ============================================================
  {
    name: "typescript/tsc-clean passes type checking",
    config: "tests/e2e/projects/typescript/tsc-clean/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["✓ TypeScript: passed"],
  },

  // ============================================================
  // Custom ESLint rules
  // ============================================================
  {
    name: "typescript/with-custom-rules catches custom rule violations",
    config: "tests/e2e/projects/typescript/with-custom-rules/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ ESLint:", "no-console", "eqeqeq"],
  },

  // ============================================================
  // Ruff with select/ignore
  // ============================================================
  {
    name: "python/with-select-ignore uses select and ignore",
    config: "tests/e2e/projects/python/with-select-ignore/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ Ruff:", "F401"],
    notExpectedPatterns: ["E501"],
  },

  // ============================================================
  // Missing config file
  // ============================================================
  {
    name: "config-errors/no-config returns error for missing config",
    config: "tests/e2e/projects/config-errors/no-config/nonexistent.toml",
    command: "check",
    expectedExitCode: 2,
    expectedPatterns: ["Config error:", "not found"],
  },

  // ============================================================
  // Knip: Unused code detection
  // ============================================================
  {
    name: "knip/unused-file detects orphaned files",
    config: "tests/e2e/projects/knip/unused-file/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Knip:", "Unused file", "orphan.ts"],
  },
  {
    name: "knip/unused-dependency detects unused dependencies",
    config: "tests/e2e/projects/knip/unused-dependency/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Knip:", "Unused dependency", "lodash"],
  },
  {
    name: "knip/clean passes when no unused code",
    config: "tests/e2e/projects/knip/clean/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["Knip: passed", "All checks passed"],
  },
  {
    name: "knip/disabled skips Knip when disabled",
    config: "tests/e2e/projects/knip/disabled/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["CODE"],
    notExpectedPatterns: ["Knip"],
  },
  {
    name: "knip/unused-export detects unused exports",
    config: "tests/e2e/projects/knip/unused-export/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Knip:", "Unused export", "unusedExport"],
  },
  {
    name: "knip/unused-type detects unused types",
    config: "tests/e2e/projects/knip/unused-type/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Knip:", "Unused type"],
  },
  {
    name: "knip/unlisted-dependency detects unlisted dependencies",
    config: "tests/e2e/projects/knip/unlisted-dependency/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Knip:", "Unlisted dependency", "lodash"],
  },
  {
    name: "knip/duplicate-export detects unused re-exports",
    config: "tests/e2e/projects/knip/duplicate-export/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Knip:", "Unused export", "helperAlias"],
  },
  {
    name: "knip/audit passes when package.json exists",
    config: "tests/e2e/projects/knip/clean/check.toml",
    command: "audit",
    expectedExitCode: 0,
    expectedPatterns: ["Knip: passed"],
  },

  // ============================================================
  // Vulture: Dead Python code detection
  // ============================================================
  {
    name: "vulture/clean passes when no dead code",
    config: "tests/e2e/projects/vulture/clean/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["Vulture: passed", "All checks passed"],
  },
  {
    name: "vulture/disabled skips Vulture when disabled",
    config: "tests/e2e/projects/vulture/disabled/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["CODE"],
    notExpectedPatterns: ["Vulture"],
  },
  {
    name: "vulture/unused-function detects unused functions",
    config: "tests/e2e/projects/vulture/unused-function/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Vulture:", "unused", "unused_helper"],
  },
  {
    name: "vulture/unused-import detects unused imports",
    config: "tests/e2e/projects/vulture/unused-import/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Vulture:", "unused", "os"],
  },
  {
    name: "vulture/unused-variable detects unused variables",
    config: "tests/e2e/projects/vulture/unused-variable/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Vulture:", "unused", "unused_var"],
  },
  {
    name: "vulture/audit passes when pyproject.toml exists",
    config: "tests/e2e/projects/vulture/clean/check.toml",
    command: "audit",
    expectedExitCode: 0,
    expectedPatterns: ["Vulture: passed"],
  },

  // ============================================================
  // Ruff Format: Python code formatting
  // ============================================================
  {
    name: "ruff-format/clean passes when code is formatted",
    config: "tests/e2e/projects/ruff-format/clean/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["Ruff Format: passed", "All checks passed"],
  },
  {
    name: "ruff-format/unformatted detects unformatted code",
    config: "tests/e2e/projects/ruff-format/unformatted/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Ruff Format:", "not formatted correctly"],
  },
  {
    name: "ruff-format/disabled skips when format is false",
    config: "tests/e2e/projects/ruff-format/disabled/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["Ruff: passed"],
    notExpectedPatterns: ["Ruff Format"],
  },

  // ============================================================
  // Prettier: JavaScript/TypeScript code formatting
  // ============================================================
  {
    name: "prettier/clean passes when code is formatted",
    config: "tests/e2e/projects/prettier/clean/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["Prettier: passed", "All checks passed"],
  },
  {
    name: "prettier/unformatted detects unformatted code",
    config: "tests/e2e/projects/prettier/unformatted/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Prettier:", "not formatted correctly"],
  },
  {
    name: "prettier/disabled skips when prettier is disabled",
    config: "tests/e2e/projects/prettier/disabled/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["CODE"],
    notExpectedPatterns: ["Prettier"],
  },

  // ============================================================
  // Tests Validation: Test file existence
  // ============================================================
  {
    name: "tests-validation/with-tests passes when test files exist",
    config: "tests/e2e/projects/tests-validation/with-tests/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["Tests: passed", "All checks passed"],
  },
  {
    name: "tests-validation/no-tests fails when no test files exist",
    config: "tests/e2e/projects/tests-validation/no-tests/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Tests:", "No test files found"],
  },
  {
    name: "tests-validation/custom-pattern uses custom pattern",
    config: "tests/e2e/projects/tests-validation/custom-pattern/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["Tests: passed"],
  },
  {
    name: "tests-validation/disabled skips when tests validation is disabled",
    config: "tests/e2e/projects/tests-validation/disabled/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["CODE"],
    notExpectedPatterns: ["Tests"],
  },

  // ============================================================
  // ty: Python type checking
  // ============================================================
  {
    name: "ty/clean passes when no type errors",
    config: "tests/e2e/projects/ty/clean/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["ty: passed"],
  },
  {
    name: "ty/type-error detects type errors",
    config: "tests/e2e/projects/ty/type-error/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["ty:", "invalid-assignment"],
  },
  {
    name: "ty/disabled skips when ty is disabled",
    config: "tests/e2e/projects/ty/disabled/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["CODE"],
    notExpectedPatterns: ["ty:"],
  },

  // ============================================================
  // Naming: File and folder naming conventions
  // ============================================================
  {
    name: "naming/ts-kebab-pass passes for correct kebab-case TypeScript files",
    config: "tests/e2e/projects/naming/ts-kebab-pass/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["Naming: passed", "All checks passed"],
  },
  {
    name: "naming/ts-kebab-fail detects PascalCase and camelCase violations",
    config: "tests/e2e/projects/naming/ts-kebab-fail/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Naming:", "MyComponent", "kebab-case", "userService"],
  },
  {
    name: "naming/py-snake-pass passes for correct snake_case Python files",
    config: "tests/e2e/projects/naming/py-snake-pass/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["Naming: passed", "All checks passed"],
  },
  {
    name: "naming/py-snake-fail detects camelCase and kebab-case violations in Python",
    config: "tests/e2e/projects/naming/py-snake-fail/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Naming:", "myModule", "snake_case", "my-helper"],
  },
  {
    name: "naming/folder-fail detects folder naming violations",
    config: "tests/e2e/projects/naming/folder-fail/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["Naming:", "BadFolder", "folder-case"],
  },
  {
    name: "naming/mixed-rules applies different rules to different extensions",
    config: "tests/e2e/projects/naming/mixed-rules/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["Naming: passed"],
  },
  {
    name: "naming/pascal-case passes for PascalCase React components",
    config: "tests/e2e/projects/naming/pascal-case/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["Naming: passed"],
  },
  {
    name: "naming/nested-folders validates all folder levels",
    config: "tests/e2e/projects/naming/nested-folders/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["Naming: passed"],
  },
  {
    name: "naming/disabled skips naming check when disabled",
    config: "tests/e2e/projects/naming/disabled/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["CODE"],
    notExpectedPatterns: ["Naming"],
  },
  {
    name: "naming/audit passes when config is valid",
    config: "tests/e2e/projects/naming/ts-kebab-pass/check.toml",
    command: "audit",
    expectedExitCode: 0,
    expectedPatterns: ["Naming Config: passed"],
  },

  // ============================================================
  // Disable Comments: Detect linter disable comments
  // ============================================================
  {
    name: "disable-comments/clean passes when no disable comments exist",
    config: "tests/e2e/projects/disable-comments/clean/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["✓ Disable Comments: passed"],
  },
  {
    name: "disable-comments/violations detects disable comments",
    config: "tests/e2e/projects/disable-comments/violations/check.toml",
    command: "check",
    expectedExitCode: 1,
    expectedPatterns: ["✗ Disable Comments:", "@ts-ignore", "eslint-disable-next-line"],
  },
  {
    name: "disable-comments/disabled skips check when disabled",
    config: "tests/e2e/projects/disable-comments/disabled/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["CODE"],
    notExpectedPatterns: ["Disable Comments"],
  },

  // ============================================================
  // Process: Git hooks validation
  // ============================================================
  {
    name: "process/hooks-clean passes when husky and required hooks exist",
    config: "tests/e2e/projects/process/hooks-clean/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 0,
    expectedPatterns: ["✓ Hooks: passed", "All checks passed"],
  },
  {
    name: "process/hooks-no-husky fails when husky not installed",
    config: "tests/e2e/projects/process/hooks-no-husky/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 1,
    expectedPatterns: ["✗ Hooks:", "Husky not installed"],
  },
  {
    name: "process/hooks-missing-hook fails when required hook is missing",
    config: "tests/e2e/projects/process/hooks-missing-hook/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 1,
    expectedPatterns: ["✗ Hooks:", "Required hook 'pre-push' not found"],
  },
  {
    name: "process/hooks-missing-command fails when required command is missing",
    config: "tests/e2e/projects/process/hooks-missing-command/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 1,
    expectedPatterns: ["✗ Hooks:", "does not contain required command", "lint-staged"],
  },
  {
    name: "process/hooks-disabled skips hooks check when disabled",
    config: "tests/e2e/projects/process/hooks-disabled/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 0,
    expectedPatterns: ["PROCESS"],
    notExpectedPatterns: ["Hooks"],
  },

  // ============================================================
  // Process: CI/CD workflow validation
  // ============================================================
  {
    name: "process/ci-clean passes when all workflows, jobs, and actions exist",
    config: "tests/e2e/projects/process/ci-clean/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 0,
    expectedPatterns: ["✓ CI: passed", "All checks passed"],
  },
  {
    name: "process/ci-no-workflows-dir fails when .github/workflows missing",
    config: "tests/e2e/projects/process/ci-no-workflows-dir/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 1,
    expectedPatterns: ["✗ CI:", "GitHub workflows directory not found"],
  },
  {
    name: "process/ci-missing-workflow fails when required workflow is missing",
    config: "tests/e2e/projects/process/ci-missing-workflow/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 1,
    expectedPatterns: ["✗ CI:", "Required workflow 'release.yml' not found"],
  },
  {
    name: "process/ci-missing-job fails when required job is missing",
    config: "tests/e2e/projects/process/ci-missing-job/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 1,
    expectedPatterns: ["✗ CI:", "missing required job: build"],
  },
  {
    name: "process/ci-missing-action fails when required action is missing",
    config: "tests/e2e/projects/process/ci-missing-action/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 1,
    expectedPatterns: ["✗ CI:", "missing required action: actions/setup-node"],
  },
  {
    name: "process/ci-disabled skips CI check when disabled",
    config: "tests/e2e/projects/process/ci-disabled/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 0,
    expectedPatterns: ["PROCESS"],
    notExpectedPatterns: ["CI"],
  },

  // ============================================================
  // Process: Branch naming validation
  // ============================================================
  {
    // Note: In CI shallow clones, branch detection may fail and skip instead of pass
    name: "process/branches-excluded passes or skips (CI shallow clone)",
    config: "tests/e2e/projects/process/branches-excluded/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 0,
    expectedPatterns: ["Branches:", "All checks passed"],
  },
  {
    name: "process/branches-disabled skips branch check when disabled",
    config: "tests/e2e/projects/process/branches-disabled/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 0,
    expectedPatterns: ["PROCESS"],
    notExpectedPatterns: ["Branches"],
  },

  // ============================================================
  // Process: PR size validation
  // ============================================================
  {
    name: "process/pr-pass passes when PR is within size limits",
    config: "tests/e2e/projects/process/pr-pass/check.toml",
    command: "check",
    domain: "process",
    env: { GITHUB_EVENT_PATH: "tests/e2e/projects/process/pr-pass/event.json" },
    expectedExitCode: 0,
    expectedPatterns: ["✓ PR: passed", "All checks passed"],
  },
  {
    name: "process/pr-exceed-files fails when PR has too many files",
    config: "tests/e2e/projects/process/pr-exceed-files/check.toml",
    command: "check",
    domain: "process",
    env: { GITHUB_EVENT_PATH: "tests/e2e/projects/process/pr-exceed-files/event.json" },
    expectedExitCode: 1,
    expectedPatterns: ["✗ PR:", "35 files changed", "max: 20"],
  },
  {
    name: "process/pr-exceed-lines fails when PR has too many lines",
    config: "tests/e2e/projects/process/pr-exceed-lines/check.toml",
    command: "check",
    domain: "process",
    env: { GITHUB_EVENT_PATH: "tests/e2e/projects/process/pr-exceed-lines/event.json" },
    expectedExitCode: 1,
    expectedPatterns: ["✗ PR:", "550 lines changed", "max: 400"],
  },
  {
    name: "process/pr-no-context skips when not in PR context",
    config: "tests/e2e/projects/process/pr-no-context/check.toml",
    command: "check",
    domain: "process",
    // Explicitly unset GITHUB_EVENT_PATH to override CI's value
    env: { GITHUB_EVENT_PATH: "" },
    expectedExitCode: 0,
    expectedPatterns: ["PR: skipped", "Not in a PR context"],
  },
  {
    name: "process/pr-disabled skips PR check when disabled",
    config: "tests/e2e/projects/process/pr-disabled/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 0,
    expectedPatterns: ["PROCESS"],
    notExpectedPatterns: ["PR:"],
  },

  // ============================================================
  // Process: Ticket reference validation
  // ============================================================
  {
    name: "process/tickets-disabled skips tickets check when disabled",
    config: "tests/e2e/projects/process/tickets-disabled/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 0,
    expectedPatterns: ["PROCESS"],
    notExpectedPatterns: ["Tickets:"],
  },
  {
    name: "process/tickets-no-pattern skips when no pattern configured",
    config: "tests/e2e/projects/process/tickets-no-pattern/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 0,
    expectedPatterns: ["Tickets: skipped", "No ticket pattern configured"],
  },

  // ============================================================
  // Process: Coverage enforcement
  // ============================================================
  {
    name: "process/coverage-config-pass passes when vitest config has thresholds",
    config: "tests/e2e/projects/process/coverage-config-pass/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 0,
    expectedPatterns: ["✓ Coverage: passed"],
  },
  {
    name: "process/coverage-config-fail fails when no coverage config found",
    config: "tests/e2e/projects/process/coverage-config-fail/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 1,
    expectedPatterns: ["✗ Coverage:", "No coverage threshold config found"],
  },
  {
    name: "process/coverage-disabled skips coverage check when disabled",
    config: "tests/e2e/projects/process/coverage-disabled/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 0,
    expectedPatterns: ["PROCESS"],
    notExpectedPatterns: ["Coverage:"],
  },

  // ============================================================
  // Process: Repository settings
  // ============================================================
  {
    name: "process/repo-codeowners-pass passes when CODEOWNERS exists",
    config: "tests/e2e/projects/process/repo-codeowners-pass/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 0,
    // Note: This test may skip if gh CLI is not available or not in a repo
    expectedPatterns: ["PROCESS"],
  },
  {
    name: "process/repo-codeowners-fail fails when CODEOWNERS missing",
    config: "tests/e2e/projects/process/repo-codeowners-fail/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 1,
    // This should fail because CODEOWNERS is required but missing
    expectedPatterns: ["Repository:"],
  },
  {
    name: "process/repo-disabled skips repo check when disabled",
    config: "tests/e2e/projects/process/repo-disabled/check.toml",
    command: "check",
    domain: "process",
    expectedExitCode: 0,
    expectedPatterns: ["PROCESS"],
    notExpectedPatterns: ["Repository:"],
  },

  // ============================================================
  // Gitleaks: Secret detection
  // ============================================================
  {
    name: "gitleaks/clean passes when no secrets found",
    config: "tests/e2e/projects/gitleaks/clean/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["✓ gitleaks: passed"],
  },
  // TODO: Fix gitleaks custom config detection in CI - works locally but fails in CI
  // See: https://github.com/chrismlittle123/check-my-toolkit/issues/46
  // {
  //   name: "gitleaks/with-secret detects hardcoded secrets",
  //   config: "tests/e2e/projects/gitleaks/with-secret/check.toml",
  //   command: "check",
  //   expectedExitCode: 1,
  //   expectedPatterns: ["✗ gitleaks:", "test-secret-pattern"],
  // },
  // {
  //   name: "gitleaks/with-db-secret detects database connection strings (ISSUE-002)",
  //   config: "tests/e2e/projects/gitleaks/with-db-secret/check.toml",
  //   command: "check",
  //   expectedExitCode: 1,
  //   expectedPatterns: ["✗ gitleaks:", "postgres-connection-string"],
  // },
  {
    name: "gitleaks/disabled skips when secrets check is disabled",
    config: "tests/e2e/projects/gitleaks/disabled/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["CODE"],
    notExpectedPatterns: ["gitleaks:"], // Check for tool output, not config path
  },

  // ============================================================
  // npm audit: Dependency vulnerability scanning
  // ============================================================
  {
    name: "npmaudit/clean passes when no vulnerabilities",
    config: "tests/e2e/projects/npmaudit/clean/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["✓ npmaudit: passed"],
  },
  {
    name: "npmaudit/disabled skips when npm audit is disabled",
    config: "tests/e2e/projects/npmaudit/disabled/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["CODE"],
    notExpectedPatterns: ["npmaudit:"], // Check for tool output, not config path
  },

  // ============================================================
  // pip-audit: Python dependency vulnerability scanning
  // ============================================================
  {
    name: "pipaudit/clean passes when no vulnerabilities",
    config: "tests/e2e/projects/pipaudit/clean/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["✓ pipaudit: passed"],
  },
  {
    name: "pipaudit/disabled skips when pip-audit is disabled",
    config: "tests/e2e/projects/pipaudit/disabled/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["CODE"],
    notExpectedPatterns: ["pipaudit:"], // Check for tool output, not config path
  },

  // ============================================================
  // Registry/Extends: Config inheritance from rulesets
  // ============================================================
  {
    name: "registry/local-extends inherits config from local registry",
    config: "tests/e2e/projects/registry/local-extends/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["✓ ESLint: passed"],
    notExpectedPatterns: ["Ruff"], // Ruff is disabled in local override
  },
];

function runCli(
  command: string,
  config: string,
  format = "text",
  domain = "code",
  env?: Record<string, string>
): { stdout: string; exitCode: number } {
  const formatArg = format !== "text" ? ` -f ${format}` : "";
  const cmd =
    command === "validate"
      ? `node dist/cli.js validate config -c "${config}"${formatArg}`
      : `node dist/cli.js ${domain} ${command} -c "${config}"${formatArg}`;

  try {
    const stdout = execSync(cmd, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: env ? { ...process.env, ...env } : process.env,
    });
    return { stdout, exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };
    const stdout = (execError.stdout || "") + (execError.stderr || "");
    return { stdout, exitCode: execError.status ?? 1 };
  }
}

describe("E2E Tests", () => {
  for (const tc of testCases) {
    it.concurrent(tc.name, async () => {
      const { stdout, exitCode } = runCli(tc.command, tc.config, tc.format, tc.domain, tc.env);

      // Check exit code
      expect(exitCode, `Expected exit code ${tc.expectedExitCode}, got ${exitCode}\nOutput:\n${stdout}`).toBe(
        tc.expectedExitCode
      );

      // Check expected patterns
      for (const pattern of tc.expectedPatterns) {
        expect(stdout, `Expected output to contain "${pattern}"\nOutput:\n${stdout}`).toContain(pattern);
      }

      // Check patterns that should NOT be present
      if (tc.notExpectedPatterns) {
        for (const pattern of tc.notExpectedPatterns) {
          expect(stdout, `Expected output to NOT contain "${pattern}"\nOutput:\n${stdout}`).not.toContain(pattern);
        }
      }
    });
  }
});

// =============================================================================
// Projects Detect E2E Tests
// =============================================================================

function runProjectsDetect(
  cwd: string,
  args = "",
  format = "text"
): { stdout: string; exitCode: number } {
  const formatArg = format !== "text" ? ` -f ${format}` : "";
  const cmd = `node ${path.resolve("dist/cli.js")} projects detect${args}${formatArg}`;

  try {
    const stdout = execSync(cmd, {
      encoding: "utf-8",
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout, exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };
    const stdout = (execError.stdout || "") + (execError.stderr || "");
    return { stdout, exitCode: execError.status ?? 1 };
  }
}

describe("Projects Detect E2E Tests", () => {
  const fixtureDir = path.resolve("tests/e2e/projects/monorepo-detect");

  it("detects projects and shows status", () => {
    const { stdout, exitCode } = runProjectsDetect(fixtureDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Detected");
    expect(stdout).toContain("apps/web");
    expect(stdout).toContain("apps/api");
    expect(stdout).toContain("lambdas/processor");
    expect(stdout).toContain("typescript");
    expect(stdout).toContain("python");
    expect(stdout).toContain("has check.toml");
    expect(stdout).toContain("missing check.toml");
  });

  it("outputs JSON format", () => {
    const { stdout, exitCode } = runProjectsDetect(fixtureDir, "", "json");

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.projects).toHaveLength(3);
    expect(output.summary.withConfig).toBe(1);
    expect(output.summary.missingConfig).toBe(2);
    expect(output.workspaceRoots).toContain(".");
  });

  it("--dry-run shows what would be created without creating", () => {
    const { stdout, exitCode } = runProjectsDetect(fixtureDir, " --dry-run");

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Would create");
    expect(stdout).toContain("apps/api/check.toml");
    expect(stdout).toContain("lambdas/processor/check.toml");

    // Verify files were NOT created
    expect(fs.existsSync(path.join(fixtureDir, "apps/api/check.toml"))).toBe(false);
    expect(fs.existsSync(path.join(fixtureDir, "lambdas/processor/check.toml"))).toBe(false);
  });

  it("skips workspace root", () => {
    const { stdout, exitCode } = runProjectsDetect(fixtureDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Skipped");
    expect(stdout).toContain("workspace root");
  });
});

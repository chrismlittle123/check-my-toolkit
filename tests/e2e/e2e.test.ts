import { execSync } from "node:child_process";

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
    name: "typescript/empty-project skips when no ESLint config",
    config: "tests/e2e/projects/typescript/empty-project/check.toml",
    command: "check",
    expectedExitCode: 0,
    expectedPatterns: ["skipped - No ESLint config found"],
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
];

function runCli(command: string, config: string): { stdout: string; exitCode: number } {
  const cmd =
    command === "validate"
      ? `node dist/cli.js validate -c "${config}"`
      : `node dist/cli.js code ${command} -c "${config}"`;

  try {
    const stdout = execSync(cmd, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
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
      const { stdout, exitCode } = runCli(tc.command, tc.config);

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

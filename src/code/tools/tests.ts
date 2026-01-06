import { glob } from "glob";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseToolRunner } from "./base.js";

/** Default glob pattern for test files */
const DEFAULT_PATTERN = "**/*.{test,spec}.{ts,tsx,js,jsx,py}";

/** Default minimum number of test files required */
const DEFAULT_MIN_TEST_FILES = 1;

/** Configuration for tests validation */
interface TestsConfig {
  enabled?: boolean;
  pattern?: string;
  min_test_files?: number;
}

/**
 * Tests validation runner for checking test file existence
 * Validates that test files exist and match expected patterns
 */
export class TestsRunner extends BaseToolRunner {
  readonly name = "Tests";
  readonly rule = "code.tests";
  readonly toolId = "tests";
  readonly configFiles: string[] = []; // No config file needed

  private config: TestsConfig = {};

  /**
   * Set the configuration for this runner
   */
  setConfig(config: TestsConfig): void {
    this.config = config;
  }

  /**
   * Get the glob pattern to use for finding test files
   */
  private getPattern(): string {
    return this.config.pattern ?? DEFAULT_PATTERN;
  }

  /**
   * Get the minimum number of test files required
   */
  private getMinTestFiles(): number {
    return this.config.min_test_files ?? DEFAULT_MIN_TEST_FILES;
  }

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const pattern = this.getPattern();
    const minTestFiles = this.getMinTestFiles();

    try {
      // Find all test files matching the pattern
      const testFiles = await glob(pattern, {
        cwd: projectRoot,
        ignore: ["**/node_modules/**", "**/.git/**"],
        nodir: true,
      });

      const fileCount = testFiles.length;

      // Check if we have enough test files
      if (fileCount < minTestFiles) {
        const violations: Violation[] = [
          this.createInsufficientTestsViolation(fileCount, minTestFiles, pattern),
        ];
        return this.fail(violations, Date.now() - startTime);
      }

      return this.pass(Date.now() - startTime);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return this.fail(
        [this.createErrorViolation(`Tests validation error: ${message}`)],
        Date.now() - startTime
      );
    }
  }

  private createInsufficientTestsViolation(
    found: number,
    required: number,
    pattern: string
  ): Violation {
    const message =
      found === 0
        ? `No test files found matching pattern "${pattern}". Expected at least ${required}.`
        : `Found ${found} test file(s) matching pattern "${pattern}", but ${required} required.`;

    return {
      rule: `${this.rule}.${this.toolId}`,
      tool: this.toolId,
      message,
      code: "min-test-files",
      severity: "error",
    };
  }

  private createErrorViolation(message: string): Violation {
    return {
      rule: `${this.rule}.${this.toolId}`,
      tool: this.toolId,
      message,
      severity: "error",
    };
  }

  /**
   * Audit - for tests, we just check if the config is valid
   * Since there's no external config file, we always pass
   */
  override async audit(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();

    // Tests validation doesn't require external config files
    // Just verify the pattern is valid by attempting to use it
    const pattern = this.getPattern();

    try {
      // Validate pattern by attempting a glob with early termination
      // Use iterator to avoid scanning all files - we just need to check pattern is valid
      const iterator = glob.iterate(pattern, {
        cwd: projectRoot,
        ignore: ["**/node_modules/**"],
        nodir: true,
      });
      // Try to get first result to validate pattern syntax
      await iterator.next();

      return {
        name: `${this.name} Config`,
        rule: this.rule,
        passed: true,
        violations: [],
        skipped: false,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        name: `${this.name} Config`,
        rule: this.rule,
        passed: false,
        violations: [
          {
            rule: `${this.rule}.${this.toolId}`,
            tool: "audit",
            message: `Invalid test pattern "${pattern}": ${message}`,
            severity: "error",
          },
        ],
        skipped: false,
        duration: Date.now() - startTime,
      };
    }
  }
}

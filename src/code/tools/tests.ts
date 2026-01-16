import * as fs from "node:fs";
import * as path from "node:path";

import { glob } from "glob";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseToolRunner } from "./base.js";

/** Default glob pattern for test files */
const DEFAULT_PATTERN = "**/*.{test,spec}.{ts,tsx,js,jsx,py}";

/** Default minimum number of test files required */
const DEFAULT_MIN_TEST_FILES = 1;

/**
 * Split a pattern string on top-level commas, preserving braces.
 * e.g., "**\/*.{test,spec}.ts,**\/test_*.py" becomes:
 *       ["**\/*.{test,spec}.ts", "**\/test_*.py"]
 */
function splitPatterns(pattern: string): string[] {
  const patterns: string[] = [];
  let current = "";
  let braceDepth = 0;

  for (const char of pattern) {
    if (char === "{") {
      braceDepth++;
    } else if (char === "}") {
      braceDepth--;
    }

    if (char === "," && braceDepth === 0) {
      if (current.trim()) {
        patterns.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    patterns.push(current.trim());
  }
  return patterns;
}

/** Configuration for tests validation */
interface TestsConfig {
  enabled?: boolean;
  pattern?: string;
  min_test_files?: number;
  required_dir?: string;
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

  /**
   * Check if the required directory exists
   */
  private checkRequiredDir(projectRoot: string): Violation | null {
    const requiredDir = this.config.required_dir;
    if (!requiredDir) {
      return null;
    }

    const normalizedDir = requiredDir.replace(/\/$/, ""); // Remove trailing slash
    const dirPath = path.join(projectRoot, normalizedDir);

    if (!fs.existsSync(dirPath)) {
      return {
        rule: `${this.rule}.${this.toolId}`,
        tool: this.toolId,
        message: `Required test directory "${requiredDir}" does not exist`,
        code: "missing-test-dir",
        severity: "error",
      };
    }

    if (!fs.statSync(dirPath).isDirectory()) {
      return {
        rule: `${this.rule}.${this.toolId}`,
        tool: this.toolId,
        message: `"${requiredDir}" exists but is not a directory`,
        code: "not-a-directory",
        severity: "error",
      };
    }

    return null;
  }

  /**
   * Get the effective patterns, scoped to required_dir if set
   */
  private getEffectivePatterns(): string[] {
    const basePattern = this.getPattern();
    const patterns = splitPatterns(basePattern);

    const requiredDir = this.config.required_dir;
    if (!requiredDir) {
      return patterns;
    }

    // Scope patterns to the required directory
    const normalizedDir = requiredDir.replace(/\/$/, "");
    return patterns.map((p) => {
      // If pattern already starts with the required dir, use as-is
      if (p.startsWith(`${normalizedDir}/`) || p.startsWith(`${normalizedDir}\\`)) {
        return p;
      }
      // If pattern starts with **, prefix with the dir
      if (p.startsWith("**")) {
        return `${normalizedDir}/${p}`;
      }
      // Otherwise, join the pattern with the dir
      return `${normalizedDir}/${p}`;
    });
  }

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const minTestFiles = this.getMinTestFiles();

    // Check required directory exists first
    const dirViolation = this.checkRequiredDir(projectRoot);
    if (dirViolation) {
      return this.fail([dirViolation], Date.now() - startTime);
    }

    try {
      const patterns = this.getEffectivePatterns();

      // Find all test files matching the pattern(s)
      const testFiles = await glob(patterns, {
        cwd: projectRoot,
        ignore: ["**/node_modules/**", "**/.git/**"],
        nodir: true,
      });

      const fileCount = testFiles.length;

      // Check if we have enough test files
      if (fileCount < minTestFiles) {
        const violations: Violation[] = [
          this.createInsufficientTestsViolation(fileCount, minTestFiles, patterns),
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
    patterns: string[]
  ): Violation {
    const patternDisplay = patterns.length === 1 ? patterns[0] : patterns.join(", ");
    const locationHint = this.config.required_dir
      ? ` in "${this.config.required_dir}"`
      : "";

    const message =
      found === 0
        ? `No test files found${locationHint} matching pattern "${patternDisplay}". Expected at least ${required}.`
        : `Found ${found} test file(s)${locationHint} matching pattern "${patternDisplay}", but ${required} required.`;

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

    // Check required directory exists
    const dirViolation = this.checkRequiredDir(projectRoot);
    if (dirViolation) {
      return {
        name: `${this.name} Config`,
        rule: this.rule,
        passed: false,
        violations: [dirViolation],
        skipped: false,
        duration: Date.now() - startTime,
      };
    }

    // Validate pattern by attempting a glob with early termination
    const patterns = this.getEffectivePatterns();

    try {
      const iterator = glob.iterate(patterns, {
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
      const patternDisplay = patterns.join(", ");
      return {
        name: `${this.name} Config`,
        rule: this.rule,
        passed: false,
        violations: [
          {
            rule: `${this.rule}.${this.toolId}`,
            tool: "audit",
            message: `Invalid test pattern "${patternDisplay}": ${message}`,
            severity: "error",
          },
        ],
        skipped: false,
        duration: Date.now() - startTime,
      };
    }
  }
}

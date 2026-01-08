import * as path from "node:path";

import { execa } from "execa";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseToolRunner } from "./base.js";

/** ESLint JSON output message format */
interface ESLintMessage {
  ruleId: string | null;
  severity: 1 | 2;
  message: string;
  line: number;
  column: number;
}

/** ESLint JSON output file result format */
interface ESLintFileResult {
  filePath: string;
  messages: ESLintMessage[];
}

/** ESLint configuration options */
interface ESLintConfig {
  enabled?: boolean;
  files?: string[];
  ignore?: string[];
  "max-warnings"?: number;
}

/**
 * ESLint tool runner
 */
export class ESLintRunner extends BaseToolRunner {
  readonly name = "ESLint";
  readonly rule = "code.linting";
  readonly toolId = "eslint";
  readonly configFiles = [
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.cjs",
    ".eslintrc.js",
    ".eslintrc.json",
    ".eslintrc.yml",
    ".eslintrc.yaml",
  ];

  private config: ESLintConfig = {};

  /**
   * Set ESLint configuration options
   */
  setConfig(config: ESLintConfig): void {
    this.config = config;
  }

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();

    if (!this.hasConfig(projectRoot)) {
      return this.failNoConfig(Date.now() - startTime);
    }

    try {
      const args = this.buildArgs();
      const result = await execa("npx", ["eslint", ...args], {
        cwd: projectRoot,
        reject: false,
        timeout: 5 * 60 * 1000,
      });

      const violations = this.parseOutput(result.stdout, projectRoot);

      // Handle parse failure with non-zero exit
      if (violations === null && result.exitCode !== 0 && result.stderr) {
        return this.fail(
          [this.createErrorViolation(`ESLint error: ${result.stderr}`)],
          Date.now() - startTime
        );
      }

      return this.fromViolations(violations ?? [], Date.now() - startTime);
    } catch (error) {
      if (this.isNotInstalledError(error)) {
        return this.skipNotInstalled(Date.now() - startTime);
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      return this.fail(
        [this.createErrorViolation(`ESLint error: ${message}`)],
        Date.now() - startTime
      );
    }
  }

  private buildArgs(): string[] {
    const args: string[] = [];

    // Files to lint (default to ".")
    if (this.config.files && this.config.files.length > 0) {
      args.push(...this.config.files);
    } else {
      args.push(".");
    }

    // Output format
    args.push("--format", "json");

    // Ignore patterns
    if (this.config.ignore) {
      for (const pattern of this.config.ignore) {
        args.push("--ignore-pattern", pattern);
      }
    }

    // Max warnings
    if (this.config["max-warnings"] !== undefined) {
      args.push("--max-warnings", String(this.config["max-warnings"]));
    }

    return args;
  }

  private parseOutput(stdout: string, projectRoot: string): Violation[] | null {
    try {
      const results = JSON.parse(stdout) as ESLintFileResult[];
      const violations: Violation[] = [];

      for (const fileResult of results) {
        for (const msg of fileResult.messages) {
          violations.push({
            rule: `${this.rule}.${this.toolId}`,
            tool: this.toolId,
            file: path.relative(projectRoot, fileResult.filePath),
            line: msg.line,
            column: msg.column,
            message: msg.message,
            code: msg.ruleId ?? undefined,
            severity: msg.severity === 2 ? "error" : "warning",
          });
        }
      }

      return violations;
    } catch {
      return null;
    }
  }

  private createErrorViolation(message: string): Violation {
    return {
      rule: `${this.rule}.${this.toolId}`,
      tool: this.toolId,
      message,
      severity: "error",
    };
  }
}

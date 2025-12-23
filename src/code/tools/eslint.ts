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

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();

    if (!this.hasConfig(projectRoot)) {
      return this.skipNoConfig(Date.now() - startTime);
    }

    try {
      const result = await execa("npx", ["eslint", ".", "--format", "json"], {
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

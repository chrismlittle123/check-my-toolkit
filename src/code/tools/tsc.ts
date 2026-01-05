import * as path from "node:path";

import { execa } from "execa";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseToolRunner } from "./base.js";

/** Parsed tsc diagnostic */
interface TscDiagnostic {
  file: string;
  line: number;
  column: number;
  code: number;
  message: string;
}

/**
 * TypeScript type checker tool runner
 */
export class TscRunner extends BaseToolRunner {
  readonly name = "TypeScript";
  readonly rule = "code.types";
  readonly toolId = "tsc";
  readonly configFiles = ["tsconfig.json"];

  /**
   * Strip ANSI escape codes from a string
   */
  private stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
  }

  /**
   * Check if the output indicates tsc is not installed
   */
  private isTscNotFoundOutput(output: string): boolean {
    const stripped = this.stripAnsi(output);
    return stripped.includes("This is not the tsc command you are looking for") ||
           stripped.includes("command not found") ||
           stripped.includes("ENOENT");
  }

  private handleTscFailure(result: Awaited<ReturnType<typeof execa>>, projectRoot: string): Violation[] | "not-installed" {
    const stdout = String(result.stdout ?? "");
    const stderr = String(result.stderr ?? "");
    const combinedOutput = stdout || stderr;

    // Check if tsc is not installed (npx shows an error message)
    if (this.isTscNotFoundOutput(combinedOutput)) {
      return "not-installed";
    }

    const violations = this.parseOutput(stdout, projectRoot);
    if (violations.length === 0) {
      if (combinedOutput) {
        return [this.createErrorViolation(`TypeScript error: ${this.stripAnsi(combinedOutput).slice(0, 500)}`)];
      }
    }
    return violations;
  }

  private async runTsc(projectRoot: string): Promise<Awaited<ReturnType<typeof execa>>> {
    return execa("npx", ["tsc", "--noEmit"], {
      cwd: projectRoot,
      reject: false,
      timeout: 5 * 60 * 1000,
    });
  }

  private processRunResult(
    result: Awaited<ReturnType<typeof execa>>,
    projectRoot: string,
    elapsed: () => number
  ): CheckResult {
    if (result.exitCode === 0) {
      return this.pass(elapsed());
    }
    const violations = this.handleTscFailure(result, projectRoot);
    if (violations === "not-installed") {
      return this.skipNotInstalled(elapsed());
    }
    return this.fromViolations(violations, elapsed());
  }

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    if (!this.hasConfig(projectRoot)) {
      return this.skipNoConfig(elapsed());
    }

    try {
      const result = await this.runTsc(projectRoot);
      return this.processRunResult(result, projectRoot, elapsed);
    } catch (error) {
      if (this.isNotInstalledError(error)) {
        return this.skipNotInstalled(elapsed());
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      return this.fail([this.createErrorViolation(`TypeScript error: ${message}`)], elapsed());
    }
  }

  /**
   * Parse tsc output into diagnostics
   * Format: file(line,col): error TSxxxx: message
   */
  private parseOutput(stdout: string, projectRoot: string): Violation[] {
    const diagnostics = this.parseDiagnostics(stdout, projectRoot);
    return diagnostics.map((diag) => ({
      rule: `${this.rule}.${this.toolId}`,
      tool: this.toolId,
      file: diag.file,
      line: diag.line,
      column: diag.column,
      message: diag.message,
      code: `TS${diag.code}`,
      severity: "error" as const,
    }));
  }

  private parseDiagnostics(output: string, projectRoot: string): TscDiagnostic[] {
    const diagnostics: TscDiagnostic[] = [];
    const lines = output.split("\n");
    const errorRegex = /^(.+?)\((\d+),(\d+)\):\s*error\s+TS(\d+):\s*(.+)$/;

    for (const line of lines) {
      const match = errorRegex.exec(line);
      if (match) {
        const [, filePath, lineNum, colNum, code, message] = match;
        diagnostics.push({
          file: path.relative(projectRoot, filePath),
          line: parseInt(lineNum, 10),
          column: parseInt(colNum, 10),
          code: parseInt(code, 10),
          message: message.trim(),
        });
      }
    }

    return diagnostics;
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

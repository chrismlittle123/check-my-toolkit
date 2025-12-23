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

  private handleTscFailure(result: Awaited<ReturnType<typeof execa>>, projectRoot: string): Violation[] {
    const stdout = String(result.stdout ?? "");
    const violations = this.parseOutput(stdout, projectRoot);
    if (violations.length === 0) {
      const errorOutput = stdout || String(result.stderr ?? "");
      if (errorOutput) {
        return [this.createErrorViolation(`TypeScript error: ${errorOutput.slice(0, 500)}`)];
      }
    }
    return violations;
  }

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    if (!this.hasConfig(projectRoot)) {
      return this.skipNoConfig(elapsed());
    }

    try {
      const result = await execa("npx", ["tsc", "--noEmit"], {
        cwd: projectRoot,
        reject: false,
        timeout: 5 * 60 * 1000,
      });

      if (result.exitCode === 0) {
        return this.pass(elapsed());
      }

      const violations = this.handleTscFailure(result, projectRoot);
      return this.fromViolations(violations, elapsed());
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

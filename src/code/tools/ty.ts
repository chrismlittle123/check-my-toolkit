import * as path from "node:path";

import { execa } from "execa";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseToolRunner } from "./base.js";

/** Parsed ty diagnostic */
interface TyDiagnostic {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * ty Python type checker tool runner
 * ty is Astral's extremely fast Python type checker written in Rust
 */
export class TyRunner extends BaseToolRunner {
  readonly name = "ty";
  readonly rule = "code.types";
  readonly toolId = "ty";
  readonly configFiles = ["ty.toml", "pyproject.toml"];

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    try {
      // Run ty check with concise output format for easy parsing
      const result = await execa("uvx", ["ty", "check", "--output-format", "concise", "."], {
        cwd: projectRoot,
        reject: false,
        timeout: 5 * 60 * 1000,
      });

      // Exit code 0: no errors
      if (result.exitCode === 0) {
        return this.pass(elapsed());
      }

      // Exit code 1: type errors found
      if (result.exitCode === 1) {
        const violations = this.parseOutput(result.stdout ?? "", projectRoot);
        if (violations.length === 0) {
          // No parseable violations but exit code 1 means there was an error
          const errorOutput = result.stdout || result.stderr || "Type check failed";
          return this.fail([this.createErrorViolation(`ty error: ${errorOutput.slice(0, 500)}`)], elapsed());
        }
        return this.fail(violations, elapsed());
      }

      // Exit code 2: configuration or IO error
      if (result.exitCode === 2) {
        const errorMessage = result.stderr || result.stdout || "Configuration error";
        return this.fail([this.createErrorViolation(`ty configuration error: ${errorMessage.slice(0, 500)}`)], elapsed());
      }

      // Other exit codes (e.g., 101 internal error)
      const violations = this.handleUnexpectedFailure(result, projectRoot);
      return this.fromViolations(violations, elapsed());
    } catch (error) {
      if (this.isNotInstalledError(error)) {
        return this.skipNotInstalled(elapsed());
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      return this.fail([this.createErrorViolation(`ty error: ${message}`)], elapsed());
    }
  }

  private handleUnexpectedFailure(result: Awaited<ReturnType<typeof execa>>, projectRoot: string): Violation[] {
    const stdout = String(result.stdout ?? "");
    const violations = this.parseOutput(stdout, projectRoot);
    if (violations.length === 0) {
      const errorOutput = stdout || String(result.stderr ?? "");
      if (errorOutput) {
        return [this.createErrorViolation(`ty error: ${errorOutput.slice(0, 500)}`)];
      }
    }
    return violations;
  }

  /**
   * Parse ty concise output into violations
   * Format: file:line:column: severity[rule-code] message
   * Example: test.py:4:15: error[invalid-assignment] Object of type `int` is not assignable to `str`
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
      code: diag.code,
      severity: diag.severity,
    }));
  }

  private parseDiagnostics(output: string, projectRoot: string): TyDiagnostic[] {
    const diagnostics: TyDiagnostic[] = [];
    const lines = output.split("\n");
    // Format: file:line:column: severity[rule-code] message
    const diagnosticRegex = /^(.+?):(\d+):(\d+):\s*(error|warning)\[([^\]]+)\]\s*(.+)$/;

    for (const line of lines) {
      const match = diagnosticRegex.exec(line);
      if (match) {
        const [, filePath, lineNum, colNum, severity, code, message] = match;
        // Only apply path.relative if the path is absolute
        const normalizedPath = path.isAbsolute(filePath)
          ? path.relative(projectRoot, filePath)
          : filePath;
        diagnostics.push({
          file: normalizedPath,
          line: parseInt(lineNum, 10),
          column: parseInt(colNum, 10),
          code,
          message: message.trim(),
          severity: severity as "error" | "warning",
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

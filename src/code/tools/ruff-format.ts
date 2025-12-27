import * as fs from "node:fs";
import * as path from "node:path";

import { execa } from "execa";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseToolRunner } from "./base.js";

/**
 * Ruff Format tool runner for checking Python code formatting
 * Uses `ruff format --check` to verify code is formatted correctly
 */
export class RuffFormatRunner extends BaseToolRunner {
  readonly name = "Ruff Format";
  readonly rule = "code.formatting";
  readonly toolId = "ruff-format";
  readonly configFiles = ["ruff.toml", ".ruff.toml"];

  /**
   * Override hasConfig to also check for [tool.ruff] in pyproject.toml
   */
  protected override hasConfig(projectRoot: string): boolean {
    if (super.hasConfig(projectRoot)) {
      return true;
    }
    return this.hasPyprojectConfig(projectRoot);
  }

  private hasPyprojectConfig(projectRoot: string): boolean {
    const pyprojectPath = path.join(projectRoot, "pyproject.toml");
    if (!fs.existsSync(pyprojectPath)) {
      return false;
    }

    try {
      const content = fs.readFileSync(pyprojectPath, "utf-8");
      return content.includes("[tool.ruff]");
    } catch {
      return false;
    }
  }

  private async hasPythonFiles(projectRoot: string): Promise<boolean> {
    try {
      const result = await execa("find", [".", "-name", "*.py", "-type", "f"], {
        cwd: projectRoot,
        reject: false,
      });
      return Boolean(result.stdout.trim());
    } catch {
      return false;
    }
  }

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();

    // Skip if no Python files
    if (!(await this.hasPythonFiles(projectRoot))) {
      return this.skip("No Python files found", Date.now() - startTime);
    }

    try {
      // Run ruff format --check to verify formatting
      const result = await execa("ruff", ["format", "--check", "."], {
        cwd: projectRoot,
        reject: false,
        timeout: 5 * 60 * 1000,
      });

      // Exit code 0 = formatted correctly
      // Exit code 1 = would reformat (formatting issues found)
      // Exit code 2 = error
      if (result.exitCode === 0) {
        return this.pass(Date.now() - startTime);
      }

      if (result.exitCode === 2) {
        return this.fail(
          [this.createErrorViolation(`Ruff format error: ${result.stderr}`)],
          Date.now() - startTime
        );
      }

      // Parse the output to get files that need formatting
      const violations = this.parseOutput(result.stdout, result.stderr, projectRoot);
      return this.fromViolations(violations, Date.now() - startTime);
    } catch (error) {
      if (this.isNotInstalledError(error)) {
        return this.skipNotInstalled(Date.now() - startTime);
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      return this.fail(
        [this.createErrorViolation(`Ruff format error: ${message}`)],
        Date.now() - startTime
      );
    }
  }

  private skip(reason: string, duration: number): CheckResult {
    return {
      name: this.name,
      rule: this.rule,
      passed: true,
      violations: [],
      skipped: true,
      skipReason: reason,
      duration,
    };
  }

  /**
   * Parse ruff format --check output
   * Format: "Would reformat: path/to/file.py"
   */
  private parseOutput(stdout: string, stderr: string, projectRoot: string): Violation[] {
    const output = stdout + stderr;
    if (!output.trim()) {
      return [];
    }

    const violations = output
      .trim()
      .split("\n")
      .map((line) => this.parseOutputLine(line, projectRoot))
      .filter((v): v is Violation => v !== null);

    // If we couldn't parse specific files but have non-zero exit, report general issue
    if (violations.length === 0) {
      return [this.createFormatViolation()];
    }

    return violations;
  }

  private parseOutputLine(line: string, projectRoot: string): Violation | null {
    // Match "Would reformat: path/to/file.py"
    const reformatMatch = /^Would reformat:\s*(.+)$/.exec(line);
    if (reformatMatch) {
      return this.createFileViolation(reformatMatch[1].trim(), projectRoot);
    }

    // Also match plain file paths (some versions just list files)
    if (line.endsWith(".py") && !line.includes(" ")) {
      return this.createFileViolation(line.trim(), projectRoot);
    }

    return null;
  }

  private createFileViolation(filePath: string, projectRoot: string): Violation {
    const relPath = path.relative(projectRoot, path.resolve(projectRoot, filePath));
    return {
      rule: `${this.rule}.${this.toolId}`,
      tool: this.toolId,
      file: relPath,
      message: "File is not formatted correctly",
      code: "format",
      severity: "warning",
    };
  }

  private createFormatViolation(): Violation {
    return {
      rule: `${this.rule}.${this.toolId}`,
      tool: this.toolId,
      message: "Some files are not formatted correctly. Run 'ruff format .' to fix.",
      severity: "warning",
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
   * Audit - check if ruff config exists (same as RuffRunner)
   */
  override async audit(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();

    if (this.hasConfig(projectRoot)) {
      return {
        name: `${this.name} Config`,
        rule: this.rule,
        passed: true,
        violations: [],
        skipped: false,
        duration: Date.now() - startTime,
      };
    }

    const allConfigs = [...this.configFiles, "pyproject.toml [tool.ruff]"];
    return {
      name: `${this.name} Config`,
      rule: this.rule,
      passed: false,
      violations: [
        {
          rule: `${this.rule}.${this.toolId}`,
          tool: "audit",
          message: `Ruff config not found. Expected one of: ${allConfigs.join(", ")}`,
          severity: "error",
        },
      ],
      skipped: false,
      duration: Date.now() - startTime,
    };
  }
}

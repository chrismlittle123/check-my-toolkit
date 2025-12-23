import * as fs from "node:fs";
import * as path from "node:path";

import { execa } from "execa";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseToolRunner } from "./base.js";

/** Ruff JSON output message format */
interface RuffMessage {
  code: string;
  message: string;
  filename: string;
  location: {
    row: number;
    column: number;
  };
}

/**
 * Ruff (Python linter) tool runner
 */
export class RuffRunner extends BaseToolRunner {
  readonly name = "Ruff";
  readonly rule = "code.linting";
  readonly toolId = "ruff";
  readonly configFiles = ["ruff.toml", ".ruff.toml"];

  /**
   * Override hasConfig to also check for [tool.ruff] in pyproject.toml
   */
  protected override hasConfig(projectRoot: string): boolean {
    // Check dedicated config files
    if (super.hasConfig(projectRoot)) {
      return true;
    }

    // Check pyproject.toml for [tool.ruff] section
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
      const result = await execa("ruff", ["check", ".", "--output-format", "json"], {
        cwd: projectRoot,
        reject: false,
        timeout: 5 * 60 * 1000,
      });

      const violations = this.parseOutput(result.stdout, projectRoot);

      // Handle parse failure with non-zero exit
      if (violations === null && result.exitCode !== 0 && result.stderr) {
        return this.fail(
          [this.createErrorViolation(`Ruff error: ${result.stderr}`)],
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
        [this.createErrorViolation(`Ruff error: ${message}`)],
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

  private parseOutput(stdout: string, projectRoot: string): Violation[] | null {
    if (!stdout.trim()) {
      return [];
    }

    try {
      const results = JSON.parse(stdout) as RuffMessage[];
      return results.map((msg) => ({
        rule: `${this.rule}.${this.toolId}`,
        tool: this.toolId,
        file: path.relative(projectRoot, msg.filename),
        line: msg.location.row,
        column: msg.location.column,
        message: msg.message,
        code: msg.code,
        severity: "error" as const,
      }));
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

  /**
   * Override audit to include pyproject.toml check
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

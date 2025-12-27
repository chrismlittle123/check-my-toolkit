import * as fs from "node:fs";
import * as path from "node:path";

import { execa } from "execa";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseToolRunner } from "./base.js";

/**
 * Prettier tool runner for checking JavaScript/TypeScript code formatting
 * Uses `prettier --check` to verify code is formatted correctly
 */
export class PrettierRunner extends BaseToolRunner {
  readonly name = "Prettier";
  readonly rule = "code.formatting";
  readonly toolId = "prettier";
  readonly configFiles = [
    ".prettierrc",
    ".prettierrc.json",
    ".prettierrc.yaml",
    ".prettierrc.yml",
    ".prettierrc.js",
    ".prettierrc.cjs",
    ".prettierrc.mjs",
    "prettier.config.js",
    "prettier.config.cjs",
    "prettier.config.mjs",
  ];

  /**
   * Override hasConfig to also check for "prettier" key in package.json
   */
  protected override hasConfig(projectRoot: string): boolean {
    if (super.hasConfig(projectRoot)) {
      return true;
    }
    return this.hasPackageJsonConfig(projectRoot);
  }

  private hasPackageJsonConfig(projectRoot: string): boolean {
    const packageJsonPath = path.join(projectRoot, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    try {
      const content = fs.readFileSync(packageJsonPath, "utf-8");
      const pkg = JSON.parse(content) as Record<string, unknown>;
      return "prettier" in pkg;
    } catch {
      return false;
    }
  }

  private async hasFormattableFiles(projectRoot: string): Promise<boolean> {
    try {
      // Check for JS/TS/JSON/CSS/MD files
      const result = await execa(
        "find",
        [".", "-type", "f", "(",
          "-name", "*.js", "-o",
          "-name", "*.jsx", "-o",
          "-name", "*.ts", "-o",
          "-name", "*.tsx", "-o",
          "-name", "*.json", "-o",
          "-name", "*.css", "-o",
          "-name", "*.scss", "-o",
          "-name", "*.md", "-o",
          "-name", "*.yaml", "-o",
          "-name", "*.yml",
          ")",
          "-not", "-path", "*/node_modules/*",
          "-not", "-path", "*/.git/*",
        ],
        {
          cwd: projectRoot,
          reject: false,
        }
      );
      return Boolean(result.stdout.trim());
    } catch {
      return false;
    }
  }

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();

    // Skip if no formattable files
    if (!(await this.hasFormattableFiles(projectRoot))) {
      return this.createSkipResult("No formattable files found", Date.now() - startTime);
    }

    try {
      // Run prettier --check to verify formatting
      const result = await execa("npx", ["prettier", "--check", "."], {
        cwd: projectRoot,
        reject: false,
        timeout: 5 * 60 * 1000,
      });

      // Exit code 0 = formatted correctly
      // Exit code 1 = files need formatting
      // Exit code 2 = error (invalid config, etc.)
      if (result.exitCode === 0) {
        return this.pass(Date.now() - startTime);
      }

      if (result.exitCode === 2) {
        return this.fail(
          [this.createErrorViolation(`Prettier error: ${result.stderr}`)],
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
        [this.createErrorViolation(`Prettier error: ${message}`)],
        Date.now() - startTime
      );
    }
  }

  private createSkipResult(reason: string, duration: number): CheckResult {
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
   * Parse prettier --check output
   * Format: "Checking formatting...\n[warn] file1.ts\n[warn] file2.js\n..."
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
    // Match "[warn] path/to/file.ts" format
    const warnMatch = /^\[warn\]\s+(.+)$/.exec(line);
    if (warnMatch) {
      const filePath = warnMatch[1].trim();
      // Skip summary lines like "[warn] Code style issues found..."
      if (filePath.startsWith("Code style") || filePath.includes("above")) {
        return null;
      }
      return this.createFileViolation(filePath, projectRoot);
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
      message: "Some files are not formatted correctly. Run 'prettier --write .' to fix.",
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
   * Audit - check if prettier config exists
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

    const allConfigs = [...this.configFiles, 'package.json "prettier" key'];
    return {
      name: `${this.name} Config`,
      rule: this.rule,
      passed: false,
      violations: [
        {
          rule: `${this.rule}.${this.toolId}`,
          tool: "audit",
          message: `Prettier config not found. Expected one of: ${allConfigs.join(", ")}`,
          severity: "error",
        },
      ],
      skipped: false,
      duration: Date.now() - startTime,
    };
  }
}

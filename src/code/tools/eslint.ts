import * as fs from "node:fs";
import * as path from "node:path";

import { execa } from "execa";

import { CheckResult, type Violation } from "../../types/index.js";
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

/** ESLint rule value - severity or [severity, ...options] */
type ESLintRuleValue = "off" | "warn" | "error" | [string, ...unknown[]];

/** ESLint configuration options */
interface ESLintConfig {
  enabled?: boolean;
  files?: string[];
  ignore?: string[];
  "max-warnings"?: number;
  rules?: Record<string, ESLintRuleValue>;
}

/** ESLint --print-config output format */
interface ESLintPrintConfig {
  rules?: Record<string, unknown[]>;
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

  /**
   * Audit ESLint config - verify config exists and required rules are present
   */
  async audit(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    // First check if config exists
    if (!this.hasConfig(projectRoot)) {
      return this.fail(
        [
          {
            rule: `${this.rule}.${this.toolId}`,
            tool: "audit",
            message: `${this.name} config not found. Expected one of: ${this.configFiles.join(", ")}`,
            severity: "error",
          },
        ],
        elapsed()
      );
    }

    // If no rules defined, just pass
    if (!this.config.rules || Object.keys(this.config.rules).length === 0) {
      return CheckResult.pass(`${this.name} Config`, this.rule, elapsed());
    }

    // Get effective ESLint config and verify rules
    const violations = await this.auditRules(projectRoot);
    if (violations.length === 0) {
      return CheckResult.pass(`${this.name} Config`, this.rule, elapsed());
    }

    return CheckResult.fail(`${this.name} Config`, this.rule, violations, elapsed());
  }

  /**
   * Audit that required rules are present in ESLint config
   */
  private async auditRules(projectRoot: string): Promise<Violation[]> {
    const sampleFile = this.findSampleFile(projectRoot);
    if (!sampleFile) {
      return [this.createAuditViolation("No source files found to verify ESLint config against", "warning")];
    }

    const effectiveRules = await this.getEffectiveRules(projectRoot, sampleFile);
    if ("error" in effectiveRules) {
      return [this.createAuditViolation(effectiveRules.error, "error")];
    }

    return this.compareRules(projectRoot, this.config.rules ?? {}, effectiveRules.rules);
  }

  /**
   * Get effective ESLint rules for a file
   */
  private async getEffectiveRules(
    projectRoot: string,
    sampleFile: string
  ): Promise<{ rules: Record<string, unknown[]> } | { error: string }> {
    try {
      const result = await execa("npx", ["eslint", "--print-config", sampleFile], {
        cwd: projectRoot,
        reject: false,
        timeout: 30 * 1000,
      });

      if (result.exitCode !== 0) {
        return { error: `Failed to read ESLint config: ${result.stderr || "Unknown error"}` };
      }

      const config = JSON.parse(result.stdout) as ESLintPrintConfig;
      return { rules: config.rules ?? {} };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return { error: `Failed to audit ESLint config: ${msg}` };
    }
  }

  /**
   * Compare required rules against effective rules
   */
  private compareRules(
    projectRoot: string,
    requiredRules: Record<string, ESLintRuleValue>,
    effectiveRules: Record<string, unknown[]>
  ): Violation[] {
    const violations: Violation[] = [];
    const configFile = this.findConfig(projectRoot) ?? undefined;

    for (const [ruleName, requiredValue] of Object.entries(requiredRules)) {
      const effectiveRule = effectiveRules[ruleName];

      if (!effectiveRule) {
        violations.push(this.createAuditViolation(`Rule "${ruleName}" is required but not configured`, "error", configFile));
        continue;
      }

      const requiredSeverity = this.normalizeSeverity(requiredValue);
      const effectiveSeverity = this.normalizeSeverity(effectiveRule[0]);

      if (requiredSeverity !== effectiveSeverity) {
        const msg = `Rule "${ruleName}": expected "${this.severityToString(requiredSeverity)}", got "${this.severityToString(effectiveSeverity)}"`;
        violations.push(this.createAuditViolation(msg, "error", configFile));
      }
    }

    return violations;
  }

  /**
   * Create an audit violation
   */
  private createAuditViolation(message: string, severity: "error" | "warning", file?: string): Violation {
    return {
      rule: `${this.rule}.${this.toolId}`,
      tool: "audit",
      message,
      severity,
      file,
    };
  }

  /**
   * Find a sample source file to check ESLint config against
   */
  private findSampleFile(projectRoot: string): string | null {
    // Common source file patterns
    const patterns = [
      "src/index.ts",
      "src/index.js",
      "src/main.ts",
      "src/main.js",
      "index.ts",
      "index.js",
      "src/app.ts",
      "src/app.js",
    ];

    for (const pattern of patterns) {
      const filePath = path.join(projectRoot, pattern);
      if (fs.existsSync(filePath)) {
        return pattern;
      }
    }

    // Try to find any .ts or .js file in src/
    const srcDir = path.join(projectRoot, "src");
    if (fs.existsSync(srcDir)) {
      try {
        const files = fs.readdirSync(srcDir);
        const sourceFile = files.find((f) => f.endsWith(".ts") || f.endsWith(".js"));
        if (sourceFile) {
          return `src/${sourceFile}`;
        }
      } catch {
        // Ignore errors
      }
    }

    return null;
  }

  /**
   * Normalize rule severity to number (0, 1, 2)
   */
  private normalizeSeverity(value: unknown): number {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      switch (value) {
        case "off":
          return 0;
        case "warn":
          return 1;
        case "error":
          return 2;
        default:
          return parseInt(value, 10) || 0;
      }
    }
    if (Array.isArray(value)) {
      return this.normalizeSeverity(value[0]);
    }
    return 0;
  }

  /**
   * Convert severity number to string
   */
  private severityToString(severity: number): string {
    switch (severity) {
      case 0:
        return "off";
      case 1:
        return "warn";
      case 2:
        return "error";
      default:
        return String(severity);
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

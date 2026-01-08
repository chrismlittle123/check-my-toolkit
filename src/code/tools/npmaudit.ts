import { execa } from "execa";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseToolRunner } from "./base.js";

/** npm audit vulnerability entry */
interface NpmVulnerability {
  name: string;
  severity: "info" | "low" | "moderate" | "high" | "critical";
  isDirect: boolean;
  via: (string | { name: string; title?: string; url?: string })[];
  effects: string[];
  range: string;
  nodes: string[];
  fixAvailable: boolean | { name: string; version: string; isSemVerMajor: boolean };
}

/** npm audit JSON output format */
interface NpmAuditOutput {
  vulnerabilities: Record<string, NpmVulnerability>;
  metadata: {
    vulnerabilities: {
      info: number;
      low: number;
      moderate: number;
      high: number;
      critical: number;
      total: number;
    };
  };
}

/**
 * npm audit tool runner for detecting dependency vulnerabilities
 */
export class NpmAuditRunner extends BaseToolRunner {
  readonly name = "npmaudit";
  readonly rule = "code.security";
  readonly toolId = "npmaudit";
  readonly configFiles = ["package-lock.json"];

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    if (!this.hasConfig(projectRoot)) {
      return this.failNoConfig(elapsed());
    }

    try {
      const result = await execa("npm", ["audit", "--json"], {
        cwd: projectRoot,
        reject: false,
        timeout: 5 * 60 * 1000,
      });

      return this.processAuditResult(result, elapsed);
    } catch (error) {
      return this.handleRunError(error, elapsed);
    }
  }

  private processAuditResult(
    result: Awaited<ReturnType<typeof execa>>,
    elapsed: () => number
  ): CheckResult {
    const output = String(result.stdout ?? result.stderr ?? "");
    const violations = this.parseOutput(output);

    if (violations === null) {
      if (result.exitCode !== 0) {
        return this.fail(
          [this.createErrorViolation(`npm audit error: ${result.stderr ?? "Unknown error"}`)],
          elapsed()
        );
      }
      return this.pass(elapsed());
    }

    return this.fromViolations(violations, elapsed());
  }

  private handleRunError(error: unknown, elapsed: () => number): CheckResult {
    if (this.isNotInstalledError(error)) {
      return this.skipNotInstalled(elapsed());
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return this.fail([this.createErrorViolation(`npm audit error: ${message}`)], elapsed());
  }

  private parseOutput(output: string): Violation[] | null {
    try {
      const result = JSON.parse(output) as NpmAuditOutput;
      const violations: Violation[] = [];

      for (const [pkgName, vuln] of Object.entries(result.vulnerabilities)) {
        const severity = this.mapSeverity(vuln.severity);
        const title = this.getVulnerabilityTitle(vuln);
        const fixInfo = this.getFixInfo(vuln);

        violations.push({
          rule: `${this.rule}.${this.toolId}`,
          tool: this.toolId,
          file: "package-lock.json",
          message: `${pkgName}: ${title}${fixInfo}`,
          code: vuln.severity,
          severity,
        });
      }

      return violations;
    } catch {
      return null;
    }
  }

  private mapSeverity(npmSeverity: string): "error" | "warning" {
    switch (npmSeverity) {
      case "critical":
      case "high":
        return "error";
      case "moderate":
      case "low":
      case "info":
      default:
        return "warning";
    }
  }

  private getVulnerabilityTitle(vuln: NpmVulnerability): string {
    // Try to get a descriptive title from the via field
    for (const v of vuln.via) {
      if (typeof v === "object" && v.title) {
        return v.title;
      }
    }
    return `${vuln.severity} severity vulnerability`;
  }

  private getFixInfo(vuln: NpmVulnerability): string {
    if (vuln.fixAvailable === false) {
      return " (no fix available)";
    }
    if (typeof vuln.fixAvailable === "object") {
      const major = vuln.fixAvailable.isSemVerMajor ? " (breaking)" : "";
      return ` (fix: ${vuln.fixAvailable.version}${major})`;
    }
    return "";
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
   * Audit - check if package-lock.json exists
   */
  async audit(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();

    if (!this.hasConfig(projectRoot)) {
      return this.fail(
        [{
          rule: `${this.rule}.${this.toolId}`,
          tool: "audit",
          message: "package-lock.json not found (required for npm audit)",
          severity: "error",
        }],
        Date.now() - startTime
      );
    }

    return this.pass(Date.now() - startTime);
  }
}

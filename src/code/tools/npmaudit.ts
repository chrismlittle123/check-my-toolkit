import * as fs from "node:fs";
import * as path from "node:path";

import { execa } from "execa";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseToolRunner } from "./base.js";

/** Supported package managers */
type PackageManager = "npm" | "pnpm";

/** Package manager configuration */
interface PackageManagerConfig {
  name: PackageManager;
  lockFile: string;
  command: string;
  args: string[];
}

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

/** pnpm audit advisory entry */
interface PnpmAdvisory {
  module_name: string;
  severity: "info" | "low" | "moderate" | "high" | "critical";
  title: string;
  url: string;
  findings: { version: string; paths: string[] }[];
}

/** pnpm audit JSON output format */
interface PnpmAuditOutput {
  advisories?: Record<string, PnpmAdvisory>;
  metadata: {
    vulnerabilities: {
      info: number;
      low: number;
      moderate: number;
      high: number;
      critical: number;
    };
  };
}

/** Package manager configurations */
const PACKAGE_MANAGERS: PackageManagerConfig[] = [
  { name: "pnpm", lockFile: "pnpm-lock.yaml", command: "pnpm", args: ["audit", "--json"] },
  { name: "npm", lockFile: "package-lock.json", command: "npm", args: ["audit", "--json"] },
];

/**
 * Dependency audit tool runner for detecting vulnerabilities.
 * Supports npm and pnpm (auto-detected based on lock file).
 */
export class NpmAuditRunner extends BaseToolRunner {
  readonly name = "npmaudit";
  readonly rule = "code.security";
  readonly toolId = "npmaudit";
  readonly configFiles = ["package-lock.json", "pnpm-lock.yaml"];

  /**
   * Detect which package manager is being used
   */
  private detectPackageManager(projectRoot: string): PackageManagerConfig | null {
    for (const pm of PACKAGE_MANAGERS) {
      if (fs.existsSync(path.join(projectRoot, pm.lockFile))) {
        return pm;
      }
    }
    return null;
  }

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    const pm = this.detectPackageManager(projectRoot);
    if (!pm) {
      return this.fail(
        [this.createErrorViolation("No lock file found (package-lock.json or pnpm-lock.yaml)")],
        elapsed()
      );
    }

    try {
      const result = await execa(pm.command, pm.args, {
        cwd: projectRoot,
        reject: false,
        timeout: 5 * 60 * 1000,
      });

      return this.processAuditResult(result, pm, elapsed);
    } catch (error) {
      return this.handleRunError(error, pm, elapsed);
    }
  }

  private processAuditResult(
    result: Awaited<ReturnType<typeof execa>>,
    pm: PackageManagerConfig,
    elapsed: () => number
  ): CheckResult {
    const output = String(result.stdout ?? result.stderr ?? "");
    const violations = this.parseOutput(output, pm);

    if (violations === null) {
      if (result.exitCode !== 0) {
        return this.fail(
          [this.createErrorViolation(`${pm.name} audit error: ${result.stderr ?? "Unknown error"}`)],
          elapsed()
        );
      }
      return this.pass(elapsed());
    }

    return this.fromViolations(violations, elapsed());
  }

  private handleRunError(
    error: unknown,
    pm: PackageManagerConfig,
    elapsed: () => number
  ): CheckResult {
    if (this.isNotInstalledError(error)) {
      return this.skipNotInstalled(elapsed());
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return this.fail([this.createErrorViolation(`${pm.name} audit error: ${message}`)], elapsed());
  }

  private parseOutput(output: string, pm: PackageManagerConfig): Violation[] | null {
    try {
      if (pm.name === "pnpm") {
        return this.parsePnpmOutput(output, pm);
      }
      return this.parseNpmOutput(output, pm);
    } catch {
      return null;
    }
  }

  private parseNpmOutput(output: string, pm: PackageManagerConfig): Violation[] {
    const result = JSON.parse(output) as NpmAuditOutput;
    const violations: Violation[] = [];

    for (const [pkgName, vuln] of Object.entries(result.vulnerabilities)) {
      const severity = this.mapSeverity(vuln.severity);
      const title = this.getNpmVulnerabilityTitle(vuln);
      const fixInfo = this.getNpmFixInfo(vuln);

      violations.push({
        rule: `${this.rule}.${this.toolId}`,
        tool: this.toolId,
        file: pm.lockFile,
        message: `${pkgName}: ${title}${fixInfo}`,
        code: vuln.severity,
        severity,
      });
    }

    return violations;
  }

  private parsePnpmOutput(output: string, pm: PackageManagerConfig): Violation[] {
    const result = JSON.parse(output) as PnpmAuditOutput;
    const violations: Violation[] = [];

    // pnpm audit uses "advisories" instead of "vulnerabilities"
    if (!result.advisories) {
      return violations;
    }

    for (const [, advisory] of Object.entries(result.advisories)) {
      const severity = this.mapSeverity(advisory.severity);

      violations.push({
        rule: `${this.rule}.${this.toolId}`,
        tool: this.toolId,
        file: pm.lockFile,
        message: `${advisory.module_name}: ${advisory.title}`,
        code: advisory.severity,
        severity,
      });
    }

    return violations;
  }

  private mapSeverity(auditSeverity: string): "error" | "warning" {
    switch (auditSeverity) {
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

  private getNpmVulnerabilityTitle(vuln: NpmVulnerability): string {
    for (const v of vuln.via) {
      if (typeof v === "object" && v.title) {
        return v.title;
      }
    }
    return `${vuln.severity} severity vulnerability`;
  }

  private getNpmFixInfo(vuln: NpmVulnerability): string {
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
   * Audit - check if a lock file exists (npm or pnpm)
   */
  async audit(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();

    const pm = this.detectPackageManager(projectRoot);
    if (!pm) {
      return this.fail(
        [{
          rule: `${this.rule}.${this.toolId}`,
          tool: "audit",
          message: "No lock file found (package-lock.json or pnpm-lock.yaml required)",
          severity: "error",
        }],
        Date.now() - startTime
      );
    }

    return this.pass(Date.now() - startTime);
  }
}

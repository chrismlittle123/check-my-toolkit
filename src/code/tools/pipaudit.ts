import * as fs from "node:fs";

import { execa } from "execa";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseToolRunner } from "./base.js";

/** pip-audit vulnerability entry */
interface PipAuditVulnerability {
  id: string;
  fix_versions: string[];
  aliases: string[];
  description: string;
}

/** pip-audit package entry */
interface PipAuditPackage {
  name: string;
  version: string;
  vulns: PipAuditVulnerability[];
}

/** pip-audit JSON output format */
type PipAuditOutput = PipAuditPackage[];

/**
 * pip-audit tool runner for detecting Python dependency vulnerabilities
 */
export class PipAuditRunner extends BaseToolRunner {
  readonly name = "pipaudit";
  readonly rule = "code.security";
  readonly toolId = "pipaudit";
  readonly configFiles = ["requirements.txt", "pyproject.toml", "setup.py"];

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();

    // Check if any Python dependency file exists
    if (!this.hasConfig(projectRoot)) {
      return this.skipNoConfig(Date.now() - startTime);
    }

    try {
      // Try uvx first (faster, no install needed), fall back to pip-audit
      const result = await this.runPipAudit(projectRoot);

      const output = result.stdout || result.stderr;
      const violations = this.parseOutput(output);

      if (violations === null) {
        // Failed to parse output
        if (result.exitCode !== 0 && result.exitCode !== 1) {
          return this.fail(
            [this.createErrorViolation(`pip-audit error: ${result.stderr || "Unknown error"}`)],
            Date.now() - startTime
          );
        }
        return this.pass(Date.now() - startTime);
      }

      return this.fromViolations(violations, Date.now() - startTime);
    } catch (error) {
      if (this.isNotInstalledError(error)) {
        return this.skipNotInstalled(Date.now() - startTime);
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      return this.fail(
        [this.createErrorViolation(`pip-audit error: ${message}`)],
        Date.now() - startTime
      );
    }
  }

  private async runPipAudit(projectRoot: string) {
    // Try uvx first
    try {
      return await execa("uvx", ["pip-audit", "--format", "json"], {
        cwd: projectRoot,
        reject: false,
        timeout: 5 * 60 * 1000,
      });
    } catch {
      // Fall back to pip-audit directly
      return await execa("pip-audit", ["--format", "json"], {
        cwd: projectRoot,
        reject: false,
        timeout: 5 * 60 * 1000,
      });
    }
  }

  private parseOutput(output: string): Violation[] | null {
    try {
      const result = JSON.parse(output) as PipAuditOutput;
      const violations: Violation[] = [];

      for (const pkg of result) {
        for (const vuln of pkg.vulns) {
          const severity = this.mapSeverity(vuln);
          const fixInfo = this.getFixInfo(vuln);
          const vulnId = vuln.aliases.length > 0 ? vuln.aliases[0] : vuln.id;

          violations.push({
            rule: `${this.rule}.${this.toolId}`,
            tool: this.toolId,
            file: this.findDependencyFile(pkg.name),
            message: `${pkg.name}@${pkg.version}: ${vulnId}${fixInfo}`,
            code: vuln.id,
            severity,
          });
        }
      }

      return violations;
    } catch {
      return null;
    }
  }

  private mapSeverity(vuln: PipAuditVulnerability): "error" | "warning" {
    // If a fix is available, it's an error (should be fixed)
    // If no fix available, it's a warning (awareness only)
    return vuln.fix_versions.length > 0 ? "error" : "warning";
  }

  private getFixInfo(vuln: PipAuditVulnerability): string {
    if (vuln.fix_versions.length === 0) {
      return " (no fix available)";
    }
    return ` (fix: ${vuln.fix_versions[0]})`;
  }

  private findDependencyFile(_pkgName: string): string {
    // Return the most likely dependency file
    // In a real implementation, we could parse the files to find the exact location
    return "requirements.txt";
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
   * Audit - check if Python dependency files exist
   */
  async audit(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();

    // Check for any Python project file
    const hasPythonDeps =
      fs.existsSync(`${projectRoot}/requirements.txt`) ||
      fs.existsSync(`${projectRoot}/pyproject.toml`) ||
      fs.existsSync(`${projectRoot}/setup.py`);

    if (!hasPythonDeps) {
      return this.fail(
        [{
          rule: `${this.rule}.${this.toolId}`,
          tool: "audit",
          message: "No Python dependency file found (requirements.txt, pyproject.toml, or setup.py)",
          severity: "error",
        }],
        Date.now() - startTime
      );
    }

    return this.pass(Date.now() - startTime);
  }
}

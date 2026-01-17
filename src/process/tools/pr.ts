import * as fs from "node:fs";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseProcessToolRunner } from "./base.js";

/** PR configuration from check.toml */
interface PrConfig {
  enabled?: boolean;
  max_files?: number;
  max_lines?: number;
}

/** GitHub PR event payload structure (partial) */
interface GitHubPrEventPayload {
  pull_request?: {
    changed_files?: number;
    additions?: number;
    deletions?: number;
  };
}

/**
 * PR size validation runner.
 * Checks that the PR does not exceed configured size limits.
 * Reads PR data from GITHUB_EVENT_PATH environment variable (GitHub Actions context).
 */
export class PrRunner extends BaseProcessToolRunner {
  readonly name = "PR";
  readonly rule = "process.pr";
  readonly toolId = "pr";

  private config: PrConfig = {
    enabled: false,
  };

  /**
   * Set configuration from check.toml
   */
  setConfig(config: PrConfig): void {
    this.config = { ...this.config, ...config };
  }

  /** Read PR data from GitHub event payload */
  private readPrEventPayload(): GitHubPrEventPayload | null {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) {
      return null;
    }

    try {
      const content = fs.readFileSync(eventPath, "utf-8");
      return JSON.parse(content) as GitHubPrEventPayload;
    } catch {
      return null;
    }
  }

  /** Get PR data from payload, returns null if not available */
  private getPrData(
    payload: GitHubPrEventPayload | null
  ): GitHubPrEventPayload["pull_request"] | null {
    return payload?.pull_request ?? null;
  }

  /** Check if any limits are configured */
  private hasLimitsConfigured(): boolean {
    return this.config.max_files !== undefined || this.config.max_lines !== undefined;
  }

  /** Validate PR size against configured limits */
  private validatePrSize(
    pr: NonNullable<GitHubPrEventPayload["pull_request"]>,
    elapsed: () => number
  ): CheckResult {
    const violations: Violation[] = [];

    // Check files limit
    if (this.config.max_files !== undefined && pr.changed_files !== undefined) {
      if (pr.changed_files > this.config.max_files) {
        violations.push({
          rule: `${this.rule}.max_files`,
          tool: this.toolId,
          message: `PR has ${pr.changed_files} files changed (max: ${this.config.max_files})`,
          severity: "error",
        });
      }
    }

    // Check lines limit (additions + deletions)
    if (this.config.max_lines !== undefined) {
      const additions = pr.additions ?? 0;
      const deletions = pr.deletions ?? 0;
      const totalLines = additions + deletions;

      if (totalLines > this.config.max_lines) {
        violations.push({
          rule: `${this.rule}.max_lines`,
          tool: this.toolId,
          message: `PR has ${totalLines} lines changed (max: ${this.config.max_lines})`,
          severity: "error",
        });
      }
    }

    if (violations.length > 0) {
      return this.fromViolations(violations, elapsed());
    }

    return this.pass(elapsed());
  }

  /** Run PR size validation */
  async run(_projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    // Check if any limits are configured
    if (!this.hasLimitsConfigured()) {
      return this.skip("No PR size limits configured", elapsed());
    }

    // Try to read PR event payload
    const payload = this.readPrEventPayload();
    const prData = this.getPrData(payload);
    if (!prData) {
      return this.skip("Not in a PR context (GITHUB_EVENT_PATH not set or no PR data)", elapsed());
    }

    return this.validatePrSize(prData, elapsed);
  }
}

import * as fs from "node:fs";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseProcessToolRunner } from "./base.js";

/** PR configuration from check.toml */
interface PrConfig {
  enabled?: boolean;
  max_files?: number;
  max_lines?: number;
  require_issue?: boolean;
  issue_keywords?: string[];
}

/** Default keywords that link PRs to issues */
const DEFAULT_ISSUE_KEYWORDS = ["Closes", "Fixes", "Resolves"];

/** GitHub PR event payload structure (partial) */
interface GitHubPrEventPayload {
  pull_request?: {
    changed_files?: number;
    additions?: number;
    deletions?: number;
    title?: string;
    body?: string;
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
    require_issue: false,
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

  /** Check if any validation is configured */
  private hasValidationConfigured(): boolean {
    return (
      this.config.max_files !== undefined ||
      this.config.max_lines !== undefined ||
      this.config.require_issue === true
    );
  }

  /** Check if PR body contains issue reference with keyword */
  private findIssueReference(text: string | undefined): string | null {
    if (!text) {
      return null;
    }

    const keywords = this.config.issue_keywords ?? DEFAULT_ISSUE_KEYWORDS;
    // Build pattern: (Closes|Fixes|Resolves)\s+#(\d+)
    const keywordPattern = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const regex = new RegExp(`(?:${keywordPattern})\\s+#(\\d+)`, "i");
    const match = text.match(regex);
    return match ? match[1] : null;
  }

  /** Validate that PR contains issue reference */
  private validateIssueReference(pr: NonNullable<GitHubPrEventPayload["pull_request"]>): {
    passed: boolean;
    error?: string;
  } {
    if (!this.config.require_issue) {
      return { passed: true };
    }

    // Check body first (primary location for issue links)
    const bodyIssue = this.findIssueReference(pr.body);
    if (bodyIssue) {
      return { passed: true };
    }

    // Also check title as fallback
    const titleIssue = this.findIssueReference(pr.title);
    if (titleIssue) {
      return { passed: true };
    }

    const keywords = this.config.issue_keywords ?? DEFAULT_ISSUE_KEYWORDS;
    return {
      passed: false,
      error: `PR does not contain issue reference. Include "${keywords[0]} #<issue-number>" in the PR description.`,
    };
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

  /** Collect all violations from PR validations */
  private collectViolations(
    prData: NonNullable<GitHubPrEventPayload["pull_request"]>,
    elapsed: () => number
  ): Violation[] {
    const violations: Violation[] = [];

    const sizeResult = this.validatePrSize(prData, elapsed);
    if (!sizeResult.passed) {
      violations.push(...sizeResult.violations);
    }

    const issueResult = this.validateIssueReference(prData);
    if (!issueResult.passed && issueResult.error) {
      violations.push({
        rule: `${this.rule}.require_issue`,
        tool: this.toolId,
        message: issueResult.error,
        severity: "error",
      });
    }

    return violations;
  }

  /** Run PR validation */
  async run(_projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    if (!this.hasValidationConfigured()) {
      return this.skip("No PR validation configured", elapsed());
    }

    const payload = this.readPrEventPayload();
    const prData = this.getPrData(payload);
    if (!prData) {
      return this.skip("Not in a PR context (GITHUB_EVENT_PATH not set or no PR data)", elapsed());
    }

    const violations = this.collectViolations(prData, elapsed);
    return violations.length > 0
      ? this.fromViolations(violations, elapsed())
      : this.pass(elapsed());
  }
}

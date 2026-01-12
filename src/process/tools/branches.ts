import { execa } from "execa";

import { type CheckResult } from "../../types/index.js";
import { BaseProcessToolRunner } from "./base.js";

/** Branches configuration from check.toml */
interface BranchesConfig {
  enabled?: boolean;
  pattern?: string;
  exclude?: string[];
}

/**
 * Branch naming validation runner.
 * Checks that the current git branch name matches a required pattern.
 */
export class BranchesRunner extends BaseProcessToolRunner {
  readonly name = "Branches";
  readonly rule = "process.branches";
  readonly toolId = "branches";

  private config: BranchesConfig = {
    enabled: false,
  };

  /**
   * Set configuration from check.toml
   */
  setConfig(config: BranchesConfig): void {
    this.config = { ...this.config, ...config };
  }

  /** Get the current git branch name */
  private async getCurrentBranch(projectRoot: string): Promise<string | null> {
    try {
      const result = await execa("git", ["branch", "--show-current"], {
        cwd: projectRoot,
      });
      return result.stdout.trim() || null;
    } catch {
      return null;
    }
  }

  /** Check if branch is excluded from validation */
  private isExcluded(branch: string): boolean {
    const excludeList = this.config.exclude ?? [];
    return excludeList.includes(branch);
  }

  /** Validate branch name against pattern */
  private validateBranchPattern(branch: string, elapsed: () => number): CheckResult {
    const pattern = this.config.pattern;
    if (!pattern) {
      return this.skip("No branch pattern configured", elapsed());
    }

    try {
      const regex = new RegExp(pattern);
      if (regex.test(branch)) {
        return this.pass(elapsed());
      }
      return this.fromViolations(
        [{
          rule: `${this.rule}.pattern`,
          tool: this.toolId,
          message: `Branch '${branch}' does not match pattern: ${pattern}`,
          severity: "error",
        }],
        elapsed()
      );
    } catch {
      return this.fromViolations(
        [{
          rule: `${this.rule}.pattern`,
          tool: this.toolId,
          message: `Invalid regex pattern: ${pattern}`,
          severity: "error",
        }],
        elapsed()
      );
    }
  }

  /** Run branch naming validation */
  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    const branch = await this.getCurrentBranch(projectRoot);
    if (!branch) {
      return this.skip("Not in a git repository or no branch checked out", elapsed());
    }

    if (this.isExcluded(branch)) {
      return this.pass(elapsed());
    }

    return this.validateBranchPattern(branch, elapsed);
  }
}

import { execa } from "execa";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseProcessToolRunner } from "./base.js";

/** Branch protection configuration */
interface BranchProtectionConfig {
  branch?: string;
  required_reviews?: number;
  dismiss_stale_reviews?: boolean;
  require_code_owner_reviews?: boolean;
  require_status_checks?: string[];
  require_branches_up_to_date?: boolean;
  require_signed_commits?: boolean;
  enforce_admins?: boolean;
}

/** Repository configuration */
interface RepoConfig {
  enabled?: boolean;
  require_branch_protection?: boolean;
  require_codeowners?: boolean;
  branch_protection?: BranchProtectionConfig;
}

/** GitHub API response for branch protection */
interface BranchProtectionResponse {
  required_pull_request_reviews?: {
    required_approving_review_count?: number;
    dismiss_stale_reviews?: boolean;
    require_code_owner_reviews?: boolean;
  };
  required_status_checks?: {
    strict?: boolean;
    contexts?: string[];
  };
  required_signatures?: {
    enabled?: boolean;
  };
  enforce_admins?: {
    enabled?: boolean;
  };
}

/**
 * Runner for repository settings validation.
 * Checks branch protection rules and CODEOWNERS file via GitHub API.
 */
export class RepoRunner extends BaseProcessToolRunner {
  readonly name = "Repository";
  readonly rule = "process.repo";
  readonly toolId = "repo";

  private config: RepoConfig = {
    enabled: false,
    require_branch_protection: false,
    require_codeowners: false,
  };

  setConfig(config: RepoConfig): void {
    this.config = { ...this.config, ...config };
  }

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    // Check if gh CLI is available
    const ghAvailable = await this.isGhCliAvailable();
    if (!ghAvailable) {
      return this.skip("GitHub CLI (gh) not available", elapsed());
    }

    // Get repo info from git remote
    const repoInfo = await this.getRepoInfo(projectRoot);
    if (!repoInfo) {
      return this.skip("Could not determine GitHub repository from git remote", elapsed());
    }

    const violations: Violation[] = [];

    // Check CODEOWNERS file (local check - no API needed)
    if (this.config.require_codeowners) {
      violations.push(...this.checkCodeowners(projectRoot));
    }

    // Check branch protection (requires API)
    if (this.config.require_branch_protection || this.config.branch_protection) {
      const protectionViolations = await this.checkBranchProtection(repoInfo);
      violations.push(...protectionViolations);
    }

    return this.fromViolations(violations, elapsed());
  }

  private async isGhCliAvailable(): Promise<boolean> {
    try {
      await execa("gh", ["--version"]);
      return true;
    } catch {
      return false;
    }
  }

  private async getRepoInfo(projectRoot: string): Promise<{ owner: string; repo: string } | null> {
    try {
      // Use gh to get the current repo
      const result = await execa("gh", ["repo", "view", "--json", "owner,name"], {
        cwd: projectRoot,
      });
      const data = JSON.parse(result.stdout) as { owner: { login: string }; name: string };
      return { owner: data.owner.login, repo: data.name };
    } catch {
      return null;
    }
  }

  private checkCodeowners(projectRoot: string): Violation[] {
    // Check common CODEOWNERS locations
    const codeownersLocations = ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"];

    const codeownersExists = codeownersLocations.some((location) =>
      this.fileExists(projectRoot, location)
    );

    if (!codeownersExists) {
      return [
        {
          rule: `${this.rule}.codeowners`,
          tool: this.toolId,
          message:
            "CODEOWNERS file not found (checked CODEOWNERS, .github/CODEOWNERS, docs/CODEOWNERS)",
          severity: "error",
        },
      ];
    }

    return [];
  }

  private async checkBranchProtection(repoInfo: {
    owner: string;
    repo: string;
  }): Promise<Violation[]> {
    const branch = this.config.branch_protection?.branch ?? "main";

    try {
      const result = await execa("gh", [
        "api",
        `repos/${repoInfo.owner}/${repoInfo.repo}/branches/${branch}/protection`,
        "--jq",
        ".",
      ]);

      const protection = JSON.parse(result.stdout) as BranchProtectionResponse;
      return this.validateProtectionSettings(protection, branch);
    } catch (error) {
      return this.handleBranchProtectionError(error, branch);
    }
  }

  private handleBranchProtectionError(error: unknown, branch: string): Violation[] {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("404") || errorMessage.includes("Branch not protected")) {
      if (this.config.require_branch_protection) {
        return [
          {
            rule: `${this.rule}.branch_protection`,
            tool: this.toolId,
            message: `Branch '${branch}' does not have branch protection enabled`,
            severity: "error",
          },
        ];
      }
      return [];
    }

    if (errorMessage.includes("403") || errorMessage.includes("Must have admin rights")) {
      return [
        {
          rule: `${this.rule}.branch_protection`,
          tool: this.toolId,
          message: `Cannot check branch protection: insufficient permissions (requires admin access)`,
          severity: "warning",
        },
      ];
    }

    return [
      {
        rule: `${this.rule}.branch_protection`,
        tool: this.toolId,
        message: `Failed to check branch protection: ${errorMessage}`,
        severity: "error",
      },
    ];
  }

  private validateProtectionSettings(
    protection: BranchProtectionResponse,
    branch: string
  ): Violation[] {
    const bpConfig = this.config.branch_protection;
    if (!bpConfig) {
      return [];
    }

    const violations: Violation[] = [];

    violations.push(...this.checkReviewRequirements(protection, bpConfig, branch));
    violations.push(...this.checkStatusCheckRequirements(protection, bpConfig, branch));
    violations.push(...this.checkSecurityRequirements(protection, bpConfig, branch));

    return violations;
  }

  private checkReviewRequirements(
    protection: BranchProtectionResponse,
    bpConfig: BranchProtectionConfig,
    branch: string
  ): Violation[] {
    const violations: Violation[] = [];
    const prReviews = protection.required_pull_request_reviews;

    const reviewCountViolation = this.checkReviewCount(prReviews, bpConfig, branch);
    if (reviewCountViolation) {
      violations.push(reviewCountViolation);
    }

    const staleReviewViolation = this.checkStaleReviews(prReviews, bpConfig, branch);
    if (staleReviewViolation) {
      violations.push(staleReviewViolation);
    }

    const codeOwnerViolation = this.checkCodeOwnerReviews(prReviews, bpConfig, branch);
    if (codeOwnerViolation) {
      violations.push(codeOwnerViolation);
    }

    return violations;
  }

  private checkReviewCount(
    prReviews: BranchProtectionResponse["required_pull_request_reviews"],
    bpConfig: BranchProtectionConfig,
    branch: string
  ): Violation | null {
    if (bpConfig.required_reviews === undefined) {
      return null;
    }
    const actualReviews = prReviews?.required_approving_review_count ?? 0;
    if (actualReviews >= bpConfig.required_reviews) {
      return null;
    }
    return {
      rule: `${this.rule}.branch_protection.required_reviews`,
      tool: this.toolId,
      message: `Branch '${branch}' requires ${actualReviews} reviews, expected at least ${bpConfig.required_reviews}`,
      severity: "error",
    };
  }

  private checkStaleReviews(
    prReviews: BranchProtectionResponse["required_pull_request_reviews"],
    bpConfig: BranchProtectionConfig,
    branch: string
  ): Violation | null {
    if (bpConfig.dismiss_stale_reviews !== true) {
      return null;
    }
    if (prReviews?.dismiss_stale_reviews ?? false) {
      return null;
    }
    return {
      rule: `${this.rule}.branch_protection.dismiss_stale_reviews`,
      tool: this.toolId,
      message: `Branch '${branch}' does not dismiss stale reviews on new commits`,
      severity: "error",
    };
  }

  private checkCodeOwnerReviews(
    prReviews: BranchProtectionResponse["required_pull_request_reviews"],
    bpConfig: BranchProtectionConfig,
    branch: string
  ): Violation | null {
    if (bpConfig.require_code_owner_reviews !== true) {
      return null;
    }
    if (prReviews?.require_code_owner_reviews ?? false) {
      return null;
    }
    return {
      rule: `${this.rule}.branch_protection.require_code_owner_reviews`,
      tool: this.toolId,
      message: `Branch '${branch}' does not require code owner reviews`,
      severity: "error",
    };
  }

  private checkStatusCheckRequirements(
    protection: BranchProtectionResponse,
    bpConfig: BranchProtectionConfig,
    branch: string
  ): Violation[] {
    const violations: Violation[] = [];
    const statusChecks = protection.required_status_checks;

    if (bpConfig.require_status_checks && bpConfig.require_status_checks.length > 0) {
      const actualChecks = statusChecks?.contexts ?? [];
      const missingChecks = bpConfig.require_status_checks.filter(
        (check) => !actualChecks.includes(check)
      );
      if (missingChecks.length > 0) {
        violations.push({
          rule: `${this.rule}.branch_protection.require_status_checks`,
          tool: this.toolId,
          message: `Branch '${branch}' missing required status checks: ${missingChecks.join(", ")}`,
          severity: "error",
        });
      }
    }

    if (bpConfig.require_branches_up_to_date === true && !(statusChecks?.strict ?? false)) {
      violations.push({
        rule: `${this.rule}.branch_protection.require_branches_up_to_date`,
        tool: this.toolId,
        message: `Branch '${branch}' does not require branches to be up to date before merging`,
        severity: "error",
      });
    }

    return violations;
  }

  private checkSecurityRequirements(
    protection: BranchProtectionResponse,
    bpConfig: BranchProtectionConfig,
    branch: string
  ): Violation[] {
    const violations: Violation[] = [];

    if (
      bpConfig.require_signed_commits === true &&
      !(protection.required_signatures?.enabled ?? false)
    ) {
      violations.push({
        rule: `${this.rule}.branch_protection.require_signed_commits`,
        tool: this.toolId,
        message: `Branch '${branch}' does not require signed commits`,
        severity: "error",
      });
    }

    if (bpConfig.enforce_admins === true && !(protection.enforce_admins?.enabled ?? false)) {
      violations.push({
        rule: `${this.rule}.branch_protection.enforce_admins`,
        tool: this.toolId,
        message: `Branch '${branch}' does not enforce rules for administrators`,
        severity: "error",
      });
    }

    return violations;
  }
}

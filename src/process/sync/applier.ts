import { execa } from "execa";

import {
  type DesiredBranchProtection,
  type DesiredTagProtection,
  type RepoInfo,
  type SettingDiff,
  type SyncResult,
  type TagProtectionDiffResult,
} from "./types.js";

/** Error thrown when applier encounters an issue */
export class ApplierError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_PERMISSION" | "API_ERROR"
  ) {
    super(message);
    this.name = "ApplierError";
  }
}

/** Apply branch protection settings to GitHub */
export async function applyBranchProtection(
  repoInfo: RepoInfo,
  branch: string,
  desired: DesiredBranchProtection,
  diffs: SettingDiff[]
): Promise<SyncResult> {
  if (diffs.length === 0) {
    return { success: true, applied: [], failed: [] };
  }

  const requestBody = buildRequestBody(desired);

  try {
    await execa(
      "gh",
      [
        "api",
        `repos/${repoInfo.owner}/${repoInfo.repo}/branches/${branch}/protection`,
        "-X",
        "PUT",
        "--input",
        "-",
      ],
      {
        input: JSON.stringify(requestBody),
      }
    );

    return { success: true, applied: diffs, failed: [] };
  } catch (error) {
    return handleApplyError(error, diffs);
  }
}

/** Handle errors from applying branch protection */
function handleApplyError(error: unknown, diffs: SettingDiff[]): SyncResult {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes("403") || errorMessage.includes("Must have admin rights")) {
    throw new ApplierError(
      "Cannot update branch protection: insufficient permissions (requires admin access)",
      "NO_PERMISSION"
    );
  }

  return {
    success: false,
    applied: [],
    failed: diffs.map((diff) => ({ diff, error: errorMessage })),
  };
}

/** Build GitHub API request body from desired settings */
function buildRequestBody(desired: DesiredBranchProtection): Record<string, unknown> {
  const prReviews = buildPullRequestReviewsSection(desired);
  const statusChecks = buildStatusChecksSection(desired);

  return {
    ...(prReviews && { required_pull_request_reviews: prReviews }),
    ...(statusChecks && { required_status_checks: statusChecks }),
    // enforce_admins is required by GitHub API - default to false so CI/release workflows can merge
    enforce_admins: desired.enforce_admins ?? false,
    ...(desired.require_signed_commits !== undefined && {
      required_signatures: desired.require_signed_commits,
    }),
    // GitHub API requires these fields to prevent accidentally removing existing protections
    restrictions: null,
    required_linear_history: false,
    allow_force_pushes: false,
    allow_deletions: false,
  };
}

/** Build required_pull_request_reviews section */
function buildPullRequestReviewsSection(
  desired: DesiredBranchProtection
): Record<string, unknown> | null {
  const hasReviewSettings =
    desired.required_reviews !== undefined ||
    desired.dismiss_stale_reviews !== undefined ||
    desired.require_code_owner_reviews !== undefined;

  if (!hasReviewSettings) {
    return null;
  }

  return {
    ...(desired.required_reviews !== undefined && {
      required_approving_review_count: desired.required_reviews,
    }),
    ...(desired.dismiss_stale_reviews !== undefined && {
      dismiss_stale_reviews: desired.dismiss_stale_reviews,
    }),
    ...(desired.require_code_owner_reviews !== undefined && {
      require_code_owner_reviews: desired.require_code_owner_reviews,
    }),
  };
}

/** Build required_status_checks section */
function buildStatusChecksSection(
  desired: DesiredBranchProtection
): Record<string, unknown> | null {
  const hasStatusSettings =
    desired.require_status_checks !== undefined ||
    desired.require_branches_up_to_date !== undefined;

  if (!hasStatusSettings) {
    return null;
  }

  return {
    ...(desired.require_status_checks !== undefined && { contexts: desired.require_status_checks }),
    ...(desired.require_branches_up_to_date !== undefined && {
      strict: desired.require_branches_up_to_date,
    }),
  };
}

// =============================================================================
// Tag Protection (GitHub Rulesets API)
// =============================================================================

/** Apply tag protection ruleset to GitHub */
export async function applyTagProtection(
  repoInfo: RepoInfo,
  desired: DesiredTagProtection,
  diffResult: TagProtectionDiffResult
): Promise<SyncResult> {
  if (!diffResult.hasChanges) {
    return { success: true, applied: [], failed: [] };
  }

  const requestBody = buildTagRulesetBody(desired);

  try {
    if (diffResult.currentRulesetId === null) {
      // Create new ruleset
      await execa(
        "gh",
        ["api", `repos/${repoInfo.owner}/${repoInfo.repo}/rulesets`, "-X", "POST", "--input", "-"],
        { input: JSON.stringify(requestBody) }
      );
    } else {
      // Update existing ruleset
      await execa(
        "gh",
        [
          "api",
          `repos/${repoInfo.owner}/${repoInfo.repo}/rulesets/${diffResult.currentRulesetId}`,
          "-X",
          "PUT",
          "--input",
          "-",
        ],
        { input: JSON.stringify(requestBody) }
      );
    }

    return { success: true, applied: diffResult.diffs, failed: [] };
  } catch (error) {
    return handleTagApplyError(error, diffResult.diffs);
  }
}

/** Build GitHub API request body for tag ruleset */
function buildTagRulesetBody(desired: DesiredTagProtection): Record<string, unknown> {
  const rules: { type: string }[] = [];

  // Default to true if not specified
  if (desired.prevent_deletion !== false) {
    rules.push({ type: "deletion" });
  }
  if (desired.prevent_update !== false) {
    rules.push({ type: "update" });
  }

  const patterns = desired.patterns ?? ["v*"];
  const includePatterns = patterns.map((p) => `refs/tags/${p}`);

  return {
    name: "Tag Protection",
    target: "tag",
    enforcement: "active",
    conditions: {
      ref_name: {
        include: includePatterns,
        exclude: [],
      },
    },
    rules,
  };
}

/** Handle errors from applying tag protection */
function handleTagApplyError(error: unknown, diffs: SettingDiff[]): SyncResult {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes("403") || errorMessage.includes("Must have admin rights")) {
    throw new ApplierError(
      "Cannot update tag protection: insufficient permissions (requires admin access)",
      "NO_PERMISSION"
    );
  }

  return {
    success: false,
    applied: [],
    failed: diffs.map((diff) => ({ diff, error: errorMessage })),
  };
}

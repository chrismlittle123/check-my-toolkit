import { execa } from "execa";

import { type RepoInfo } from "./types.js";

/** Error thrown during cleanup operations */
class CleanupError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_PERMISSION" | "API_ERROR" | "NOT_FOUND"
  ) {
    super(message);
    this.name = "CleanupError";
  }
}

/** Classic branch protection rule */
export interface ClassicBranchProtection {
  type: "classic";
  branch: string;
  enabled: boolean;
  required_status_checks?: {
    contexts: string[];
    strict: boolean;
  };
  required_pull_request_reviews?: {
    required_approving_review_count: number;
    dismiss_stale_reviews: boolean;
    require_code_owner_reviews: boolean;
  };
  enforce_admins?: {
    enabled: boolean;
  };
  required_signatures?: {
    enabled: boolean;
  };
}

/** GitHub Ruleset summary */
export interface RulesetSummary {
  type: "ruleset";
  id: number;
  name: string;
  target: "branch" | "tag";
  enforcement: string;
  branches?: string[];
}

/** Combined protection plan showing both classic and ruleset rules */
export interface ProtectionPlan {
  rulesets: RulesetSummary[];
  classicRules: ClassicBranchProtection[];
  orphaned: ClassicBranchProtection[]; // Classic rules with no matching ruleset
  conflicts: { classic: ClassicBranchProtection; ruleset: RulesetSummary }[];
}

/** Fetch classic branch protection for a specific branch */
async function fetchClassicBranchProtection(
  repoInfo: RepoInfo,
  branch: string
): Promise<ClassicBranchProtection | null> {
  try {
    const result = await execa("gh", [
      "api",
      `repos/${repoInfo.owner}/${repoInfo.repo}/branches/${branch}/protection`,
    ]);

    const data = JSON.parse(result.stdout) as {
      required_status_checks?: { contexts: string[]; strict: boolean };
      required_pull_request_reviews?: {
        required_approving_review_count: number;
        dismiss_stale_reviews: boolean;
        require_code_owner_reviews: boolean;
      };
      enforce_admins?: { enabled: boolean };
      required_signatures?: { enabled: boolean };
    };

    return {
      type: "classic",
      branch,
      enabled: true,
      required_status_checks: data.required_status_checks,
      required_pull_request_reviews: data.required_pull_request_reviews,
      enforce_admins: data.enforce_admins,
      required_signatures: data.required_signatures,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 404 means no classic protection exists
    if (errorMessage.includes("404")) {
      return null;
    }

    if (errorMessage.includes("403")) {
      throw new CleanupError(
        "Cannot read branch protection: insufficient permissions (requires admin access)",
        "NO_PERMISSION"
      );
    }

    throw new CleanupError(`Failed to fetch branch protection: ${errorMessage}`, "API_ERROR");
  }
}

/** Fetch all GitHub Rulesets for a repository */
async function fetchRulesets(repoInfo: RepoInfo): Promise<RulesetSummary[]> {
  try {
    const result = await execa("gh", ["api", `repos/${repoInfo.owner}/${repoInfo.repo}/rulesets`]);

    const rulesets = JSON.parse(result.stdout) as {
      id: number;
      name: string;
      target: string;
      enforcement: string;
      conditions?: { ref_name?: { include?: string[] } };
    }[];

    return rulesets.map((r) => ({
      type: "ruleset" as const,
      id: r.id,
      name: r.name,
      target: r.target as "branch" | "tag",
      enforcement: r.enforcement,
      branches: r.conditions?.ref_name?.include?.map((p) => p.replace(/^refs\/heads\//, "")),
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 404 means no rulesets exist
    if (errorMessage.includes("404")) {
      return [];
    }

    if (errorMessage.includes("403")) {
      throw new CleanupError(
        "Cannot read rulesets: insufficient permissions (requires admin access)",
        "NO_PERMISSION"
      );
    }

    throw new CleanupError(`Failed to fetch rulesets: ${errorMessage}`, "API_ERROR");
  }
}

/** List all protection rules (both classic and rulesets) for common branches */
export async function listAllProtection(
  repoInfo: RepoInfo,
  branches: string[] = ["main", "master", "develop"]
): Promise<ProtectionPlan> {
  const rulesets = await fetchRulesets(repoInfo);
  const classicRules: ClassicBranchProtection[] = [];

  // Check each branch for classic protection (sequential to avoid rate limits)
  for (const branch of branches) {
    // eslint-disable-next-line no-await-in-loop
    const classic = await fetchClassicBranchProtection(repoInfo, branch);
    if (classic) {
      classicRules.push(classic);
    }
  }

  // Find orphaned classic rules (no matching ruleset)
  const orphaned: ClassicBranchProtection[] = [];
  const conflicts: { classic: ClassicBranchProtection; ruleset: RulesetSummary }[] = [];

  for (const classic of classicRules) {
    const matchingRuleset = rulesets.find(
      (r) =>
        r.target === "branch" &&
        r.branches?.some((b) => b === classic.branch || b === "~ALL" || b === "~DEFAULT_BRANCH")
    );

    if (matchingRuleset) {
      conflicts.push({ classic, ruleset: matchingRuleset });
    } else {
      orphaned.push(classic);
    }
  }

  return { rulesets, classicRules, orphaned, conflicts };
}

/** Remove classic branch protection for a specific branch */
async function removeClassicProtection(repoInfo: RepoInfo, branch: string): Promise<void> {
  try {
    await execa("gh", [
      "api",
      "--method",
      "DELETE",
      `repos/${repoInfo.owner}/${repoInfo.repo}/branches/${branch}/protection`,
    ]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("404")) {
      throw new CleanupError(`No classic protection found for branch '${branch}'`, "NOT_FOUND");
    }

    if (errorMessage.includes("403")) {
      throw new CleanupError(
        "Cannot remove branch protection: insufficient permissions (requires admin access)",
        "NO_PERMISSION"
      );
    }

    throw new CleanupError(`Failed to remove branch protection: ${errorMessage}`, "API_ERROR");
  }
}

/** Format protection plan for display */
// eslint-disable-next-line complexity, max-statements
export function formatProtectionPlan(plan: ProtectionPlan): string {
  const lines: string[] = [];

  lines.push("=== GitHub Rulesets ===");
  if (plan.rulesets.length === 0) {
    lines.push("  (none)");
  } else {
    for (const r of plan.rulesets) {
      const branches = r.branches?.join(", ") ?? "(all)";
      lines.push(`  [${r.id}] ${r.name} (${r.target}, ${r.enforcement}) -> ${branches}`);
    }
  }

  lines.push("");
  lines.push("=== Classic Branch Protection ===");
  if (plan.classicRules.length === 0) {
    lines.push("  (none)");
  } else {
    for (const c of plan.classicRules) {
      const reviews = c.required_pull_request_reviews?.required_approving_review_count ?? 0;
      lines.push(`  ${c.branch}: ${reviews} reviews required`);
    }
  }

  if (plan.conflicts.length > 0) {
    lines.push("");
    lines.push("=== Conflicts (both classic and ruleset protect same branch) ===");
    for (const { classic, ruleset } of plan.conflicts) {
      lines.push(`  ${classic.branch}: classic + ruleset "${ruleset.name}"`);
    }
  }

  if (plan.orphaned.length > 0) {
    lines.push("");
    lines.push("=== Orphaned Classic Rules (can be safely removed) ===");
    for (const c of plan.orphaned) {
      lines.push(`  ${c.branch}`);
    }
  }

  return lines.join("\n");
}

/** Run cleanup rules command logic */
// eslint-disable-next-line max-statements
export async function runCleanupRules(
  repoInfo: RepoInfo,
  branches: string[],
  apply: boolean
): Promise<void> {
  const plan = await listAllProtection(repoInfo, branches);

  if (plan.orphaned.length === 0 && plan.conflicts.length === 0) {
    process.stdout.write("No classic branch protection rules to clean up.\n");
    return;
  }

  if (!apply) {
    process.stdout.write("Preview mode (use --apply to actually remove rules)\n\n");
    process.stdout.write(`${formatProtectionPlan(plan)}\n`);
    process.stdout.write("\nRun with --apply to remove orphaned and conflicting classic rules.\n");
    return;
  }

  // Remove orphaned rules
  for (const rule of plan.orphaned) {
    process.stdout.write(`Removing classic protection from branch: ${rule.branch}\n`);
    // eslint-disable-next-line no-await-in-loop
    await removeClassicProtection(repoInfo, rule.branch);
  }

  // Remove conflicting classic rules (ruleset takes precedence)
  for (const { classic } of plan.conflicts) {
    process.stdout.write(
      `Removing conflicting classic protection from branch: ${classic.branch}\n`
    );
    // eslint-disable-next-line no-await-in-loop
    await removeClassicProtection(repoInfo, classic.branch);
  }

  const total = plan.orphaned.length + plan.conflicts.length;
  process.stdout.write(`\nRemoved ${total} classic branch protection rule(s).\n`);
}

import { execa } from "execa";

import {
  type BranchProtectionSettings,
  type GitHubBranchProtection,
  type RepoInfo,
} from "./types.js";

/** Error thrown when fetcher encounters an issue */
export class FetcherError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_GH" | "NO_REPO" | "NO_PERMISSION" | "API_ERROR"
  ) {
    super(message);
    this.name = "FetcherError";
  }
}

/** Check if gh CLI is available */
export async function isGhAvailable(): Promise<boolean> {
  try {
    await execa("gh", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

/** Get repository info from git remote */
export async function getRepoInfo(projectRoot: string): Promise<RepoInfo> {
  try {
    const result = await execa("gh", ["repo", "view", "--json", "owner,name"], {
      cwd: projectRoot,
    });
    const data = JSON.parse(result.stdout) as { owner: { login: string }; name: string };
    return { owner: data.owner.login, repo: data.name };
  } catch {
    throw new FetcherError("Could not determine GitHub repository from git remote", "NO_REPO");
  }
}

/** Fetch current branch protection settings from GitHub */
export async function fetchBranchProtection(
  repoInfo: RepoInfo,
  branch: string
): Promise<BranchProtectionSettings> {
  try {
    const result = await execa("gh", [
      "api",
      `repos/${repoInfo.owner}/${repoInfo.repo}/branches/${branch}/protection`,
    ]);

    const protection = JSON.parse(result.stdout) as GitHubBranchProtection;
    return parseGitHubProtection(branch, protection);
  } catch (error) {
    return handleFetchError(error, branch);
  }
}

/** Handle errors from fetching branch protection */
function handleFetchError(error: unknown, branch: string): BranchProtectionSettings {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes("404") || errorMessage.includes("Branch not protected")) {
    return createEmptySettings(branch);
  }

  if (errorMessage.includes("403") || errorMessage.includes("Must have admin rights")) {
    throw new FetcherError(
      "Cannot read branch protection: insufficient permissions (requires admin access)",
      "NO_PERMISSION"
    );
  }

  throw new FetcherError(`Failed to fetch branch protection: ${errorMessage}`, "API_ERROR");
}

/** Parse GitHub API response into our settings format */
function parseGitHubProtection(
  branch: string,
  protection: GitHubBranchProtection
): BranchProtectionSettings {
  return {
    branch,
    ...parsePullRequestReviews(protection.required_pull_request_reviews),
    ...parseStatusChecks(protection.required_status_checks),
    requireSignedCommits: protection.required_signatures?.enabled ?? null,
    enforceAdmins: protection.enforce_admins?.enabled ?? null,
  };
}

/** Parse PR review settings */
function parsePullRequestReviews(
  prReviews: GitHubBranchProtection["required_pull_request_reviews"]
): Pick<
  BranchProtectionSettings,
  "requiredReviews" | "dismissStaleReviews" | "requireCodeOwnerReviews"
> {
  return {
    requiredReviews: prReviews?.required_approving_review_count ?? null,
    dismissStaleReviews: prReviews?.dismiss_stale_reviews ?? null,
    requireCodeOwnerReviews: prReviews?.require_code_owner_reviews ?? null,
  };
}

/** Parse status check settings */
function parseStatusChecks(
  statusChecks: GitHubBranchProtection["required_status_checks"]
): Pick<BranchProtectionSettings, "requiredStatusChecks" | "requireBranchesUpToDate"> {
  return {
    requiredStatusChecks: statusChecks?.contexts ?? null,
    requireBranchesUpToDate: statusChecks?.strict ?? null,
  };
}

/** Create empty settings for unprotected branch */
function createEmptySettings(branch: string): BranchProtectionSettings {
  return {
    branch,
    requiredReviews: null,
    dismissStaleReviews: null,
    requireCodeOwnerReviews: null,
    requiredStatusChecks: null,
    requireBranchesUpToDate: null,
    requireSignedCommits: null,
    enforceAdmins: null,
  };
}

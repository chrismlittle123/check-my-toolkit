/** Current branch protection settings from GitHub */
export interface BranchProtectionSettings {
  branch: string;
  requiredReviews: number | null;
  dismissStaleReviews: boolean | null;
  requireCodeOwnerReviews: boolean | null;
  requiredStatusChecks: string[] | null;
  requireBranchesUpToDate: boolean | null;
  requireSignedCommits: boolean | null;
  enforceAdmins: boolean | null;
}

/** A single setting difference */
export interface SettingDiff {
  setting: string;
  current: unknown;
  desired: unknown;
  action: "add" | "change";
}

/** Result of comparing current vs. desired settings */
export interface SyncDiffResult {
  repoInfo: { owner: string; repo: string };
  branch: string;
  diffs: SettingDiff[];
  hasChanges: boolean;
}

/** Result of applying sync changes */
export interface SyncResult {
  success: boolean;
  applied: SettingDiff[];
  failed: { diff: SettingDiff; error: string }[];
}

/** Options for sync/diff commands */
export interface SyncOptions {
  config?: string;
  format: "text" | "json";
  apply?: boolean;
}

/** Repository info */
export interface RepoInfo {
  owner: string;
  repo: string;
}

/** GitHub API response for branch protection */
export interface GitHubBranchProtection {
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

/** Desired branch protection settings from config */
export interface DesiredBranchProtection {
  branch?: string;
  required_reviews?: number;
  dismiss_stale_reviews?: boolean;
  require_code_owner_reviews?: boolean;
  require_status_checks?: string[];
  require_branches_up_to_date?: boolean;
  require_signed_commits?: boolean;
  enforce_admins?: boolean;
}

// =============================================================================
// Tag Protection Types (GitHub Rulesets API)
// =============================================================================

/** GitHub Ruleset response */
export interface GitHubRuleset {
  id: number;
  name: string;
  target: "branch" | "tag";
  enforcement: "active" | "evaluate" | "disabled";
  conditions?: {
    ref_name?: {
      include?: string[];
      exclude?: string[];
    };
  };
  rules?: {
    type: "deletion" | "update" | "creation" | string;
    parameters?: Record<string, unknown>;
  }[];
}

/** Current tag protection settings from GitHub */
export interface TagProtectionSettings {
  patterns: string[];
  preventDeletion: boolean;
  preventUpdate: boolean;
  rulesetId: number | null;
  rulesetName: string | null;
}

/** Desired tag protection settings from config */
export interface DesiredTagProtection {
  patterns?: string[];
  prevent_deletion?: boolean;
  prevent_update?: boolean;
}

/** Tag protection diff result */
export interface TagProtectionDiffResult {
  repoInfo: RepoInfo;
  diffs: SettingDiff[];
  hasChanges: boolean;
  currentRulesetId: number | null;
}

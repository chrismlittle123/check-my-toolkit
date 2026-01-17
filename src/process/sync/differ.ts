import {
  type BranchProtectionSettings,
  type DesiredBranchProtection,
  type RepoInfo,
  type SettingDiff,
  type SyncDiffResult,
} from "./types.js";

/** Field mapping for comparison */
interface FieldMapping {
  name: string;
  getCurrentValue: (c: BranchProtectionSettings) => unknown;
  getDesiredValue: (d: DesiredBranchProtection) => unknown;
  isArray?: boolean;
}

/** All field mappings for branch protection settings */
const fieldMappings: FieldMapping[] = [
  {
    name: "required_reviews",
    getCurrentValue: (c) => c.requiredReviews,
    getDesiredValue: (d) => d.required_reviews,
  },
  {
    name: "dismiss_stale_reviews",
    getCurrentValue: (c) => c.dismissStaleReviews,
    getDesiredValue: (d) => d.dismiss_stale_reviews,
  },
  {
    name: "require_code_owner_reviews",
    getCurrentValue: (c) => c.requireCodeOwnerReviews,
    getDesiredValue: (d) => d.require_code_owner_reviews,
  },
  {
    name: "require_status_checks",
    getCurrentValue: (c) => c.requiredStatusChecks,
    getDesiredValue: (d) => d.require_status_checks,
    isArray: true,
  },
  {
    name: "require_branches_up_to_date",
    getCurrentValue: (c) => c.requireBranchesUpToDate,
    getDesiredValue: (d) => d.require_branches_up_to_date,
  },
  {
    name: "require_signed_commits",
    getCurrentValue: (c) => c.requireSignedCommits,
    getDesiredValue: (d) => d.require_signed_commits,
  },
  {
    name: "enforce_admins",
    getCurrentValue: (c) => c.enforceAdmins,
    getDesiredValue: (d) => d.enforce_admins,
  },
];

/** Compare current settings with desired and generate diffs */
export function computeDiff(
  repoInfo: RepoInfo,
  current: BranchProtectionSettings,
  desired: DesiredBranchProtection
): SyncDiffResult {
  const diffs = collectDiffs(current, desired);
  return {
    repoInfo,
    branch: current.branch,
    diffs,
    hasChanges: diffs.length > 0,
  };
}

/** Collect all diffs between current and desired settings */
function collectDiffs(
  current: BranchProtectionSettings,
  desired: DesiredBranchProtection
): SettingDiff[] {
  const diffs: SettingDiff[] = [];

  for (const mapping of fieldMappings) {
    const desiredValue = mapping.getDesiredValue(desired);
    if (desiredValue === undefined) {
      continue;
    }

    const currentValue = mapping.getCurrentValue(current);
    const diff = mapping.isArray
      ? compareArrayValue(mapping.name, currentValue as string[] | null, desiredValue as string[])
      : compareValue(mapping.name, currentValue, desiredValue);

    if (diff) {
      diffs.push(diff);
    }
  }

  return diffs;
}

/** Compare a single value and return diff if different */
function compareValue(setting: string, current: unknown, desired: unknown): SettingDiff | null {
  const currentValue = current ?? null;
  if (currentValue === desired) {
    return null;
  }

  return {
    setting,
    current: currentValue,
    desired,
    action: currentValue === null ? "add" : "change",
  };
}

/** Compare arrays and return diff if different */
function compareArrayValue(
  setting: string,
  current: string[] | null,
  desired: string[]
): SettingDiff | null {
  const currentArray = current ?? [];
  const sortedCurrent = [...currentArray].sort();
  const sortedDesired = [...desired].sort();

  const areEqual =
    sortedCurrent.length === sortedDesired.length &&
    sortedCurrent.every((v, i) => v === sortedDesired[i]);

  if (areEqual) {
    return null;
  }

  return {
    setting,
    current: currentArray,
    desired,
    action: currentArray.length === 0 ? "add" : "change",
  };
}

/** Format a value for display */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "not set";
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? "[]" : `[${value.join(", ")}]`;
  }
  return String(value);
}

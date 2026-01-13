import { describe, expect, it } from "vitest";

import { computeDiff, formatValue } from "../../src/process/sync/differ.js";
import type { BranchProtectionSettings, DesiredBranchProtection } from "../../src/process/sync/types.js";

describe("computeDiff", () => {
  const repoInfo = { owner: "test-owner", repo: "test-repo" };

  function createEmptySettings(branch = "main"): BranchProtectionSettings {
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

  describe("required_reviews", () => {
    it("detects difference when current is null", () => {
      const current = createEmptySettings();
      const desired: DesiredBranchProtection = { required_reviews: 2 };

      const result = computeDiff(repoInfo, current, desired);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs).toHaveLength(1);
      expect(result.diffs[0]).toEqual({
        setting: "required_reviews",
        current: null,
        desired: 2,
        action: "add",
      });
    });

    it("detects difference when values differ", () => {
      const current: BranchProtectionSettings = { ...createEmptySettings(), requiredReviews: 1 };
      const desired: DesiredBranchProtection = { required_reviews: 2 };

      const result = computeDiff(repoInfo, current, desired);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0]).toEqual({
        setting: "required_reviews",
        current: 1,
        desired: 2,
        action: "change",
      });
    });

    it("no diff when values match", () => {
      const current: BranchProtectionSettings = { ...createEmptySettings(), requiredReviews: 2 };
      const desired: DesiredBranchProtection = { required_reviews: 2 };

      const result = computeDiff(repoInfo, current, desired);

      expect(result.hasChanges).toBe(false);
      expect(result.diffs).toHaveLength(0);
    });
  });

  describe("boolean settings", () => {
    it("detects difference in dismiss_stale_reviews", () => {
      const current: BranchProtectionSettings = { ...createEmptySettings(), dismissStaleReviews: false };
      const desired: DesiredBranchProtection = { dismiss_stale_reviews: true };

      const result = computeDiff(repoInfo, current, desired);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0]).toEqual({
        setting: "dismiss_stale_reviews",
        current: false,
        desired: true,
        action: "change",
      });
    });

    it("detects difference in require_code_owner_reviews", () => {
      const current = createEmptySettings();
      const desired: DesiredBranchProtection = { require_code_owner_reviews: true };

      const result = computeDiff(repoInfo, current, desired);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0].setting).toBe("require_code_owner_reviews");
    });

    it("detects difference in enforce_admins", () => {
      const current: BranchProtectionSettings = { ...createEmptySettings(), enforceAdmins: false };
      const desired: DesiredBranchProtection = { enforce_admins: true };

      const result = computeDiff(repoInfo, current, desired);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0].setting).toBe("enforce_admins");
    });

    it("detects difference in require_signed_commits", () => {
      const current = createEmptySettings();
      const desired: DesiredBranchProtection = { require_signed_commits: true };

      const result = computeDiff(repoInfo, current, desired);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0].setting).toBe("require_signed_commits");
    });
  });

  describe("require_status_checks (array)", () => {
    it("detects difference when current is empty", () => {
      const current = createEmptySettings();
      const desired: DesiredBranchProtection = { require_status_checks: ["ci", "test"] };

      const result = computeDiff(repoInfo, current, desired);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0]).toEqual({
        setting: "require_status_checks",
        current: [],
        desired: ["ci", "test"],
        action: "add",
      });
    });

    it("detects difference when values differ", () => {
      const current: BranchProtectionSettings = { ...createEmptySettings(), requiredStatusChecks: ["ci"] };
      const desired: DesiredBranchProtection = { require_status_checks: ["ci", "lint", "test"] };

      const result = computeDiff(repoInfo, current, desired);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs[0].action).toBe("change");
    });

    it("no diff when arrays match (different order)", () => {
      const current: BranchProtectionSettings = { ...createEmptySettings(), requiredStatusChecks: ["test", "ci"] };
      const desired: DesiredBranchProtection = { require_status_checks: ["ci", "test"] };

      const result = computeDiff(repoInfo, current, desired);

      expect(result.hasChanges).toBe(false);
    });
  });

  describe("partial sync", () => {
    it("ignores fields not specified in desired config", () => {
      const current: BranchProtectionSettings = {
        ...createEmptySettings(),
        requiredReviews: 1,
        dismissStaleReviews: true,
        enforceAdmins: false,
      };
      const desired: DesiredBranchProtection = { required_reviews: 2 };

      const result = computeDiff(repoInfo, current, desired);

      expect(result.diffs).toHaveLength(1);
      expect(result.diffs[0].setting).toBe("required_reviews");
    });
  });

  describe("multiple diffs", () => {
    it("returns all diffs when multiple settings differ", () => {
      const current = createEmptySettings();
      const desired: DesiredBranchProtection = {
        required_reviews: 2,
        dismiss_stale_reviews: true,
        require_branches_up_to_date: true,
      };

      const result = computeDiff(repoInfo, current, desired);

      expect(result.hasChanges).toBe(true);
      expect(result.diffs).toHaveLength(3);
    });
  });

  describe("result structure", () => {
    it("includes repoInfo and branch", () => {
      const current = createEmptySettings("develop");
      const desired: DesiredBranchProtection = {};

      const result = computeDiff(repoInfo, current, desired);

      expect(result.repoInfo).toEqual(repoInfo);
      expect(result.branch).toBe("develop");
    });
  });
});

describe("formatValue", () => {
  it("formats null as 'not set'", () => {
    expect(formatValue(null)).toBe("not set");
  });

  it("formats undefined as 'not set'", () => {
    expect(formatValue(undefined)).toBe("not set");
  });

  it("formats empty array as '[]'", () => {
    expect(formatValue([])).toBe("[]");
  });

  it("formats array with values", () => {
    expect(formatValue(["ci", "test"])).toBe("[ci, test]");
  });

  it("formats numbers", () => {
    expect(formatValue(2)).toBe("2");
  });

  it("formats booleans", () => {
    expect(formatValue(true)).toBe("true");
    expect(formatValue(false)).toBe("false");
  });

  it("formats strings", () => {
    expect(formatValue("hello")).toBe("hello");
  });
});

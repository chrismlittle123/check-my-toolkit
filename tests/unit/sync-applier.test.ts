import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

import { ApplierError, applyBranchProtection } from "../../src/process/sync/applier.js";
import type {
  DesiredBranchProtection,
  SettingDiff,
  SyncDiffResult,
} from "../../src/process/sync/types.js";

const mockedExeca = vi.mocked(execa);

describe("applyBranchProtection", () => {
  const repoInfo = { owner: "test-owner", repo: "test-repo" };
  const branch = "main";

  // Helper to create a SyncDiffResult
  const createDiffResult = (
    diffs: SettingDiff[],
    currentRulesetId: number | null = null
  ): SyncDiffResult => ({
    repoInfo,
    branch,
    diffs,
    hasChanges: diffs.length > 0,
    currentRulesetId,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with no changes", async () => {
    const diffResult = createDiffResult([]);

    const result = await applyBranchProtection(repoInfo, branch, {}, diffResult);

    expect(result).toEqual({ success: true, applied: [], failed: [] });
    expect(mockedExeca).not.toHaveBeenCalled();
  });

  it("applies changes successfully (creates new ruleset)", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: "{}" } as never);

    const desired: DesiredBranchProtection = { required_reviews: 2 };
    const diffs: SettingDiff[] = [
      { setting: "required_reviews", current: 1, desired: 2, action: "change" },
    ];
    const diffResult = createDiffResult(diffs, null);

    const result = await applyBranchProtection(repoInfo, branch, desired, diffResult);

    expect(result.success).toBe(true);
    expect(result.applied).toEqual(diffs);
    expect(result.failed).toHaveLength(0);
    // Should use POST for creating new ruleset
    expect(mockedExeca).toHaveBeenCalledWith(
      "gh",
      ["api", "repos/test-owner/test-repo/rulesets", "-X", "POST", "--input", "-"],
      expect.objectContaining({
        input: expect.any(String),
      })
    );
  });

  it("updates existing ruleset when currentRulesetId is provided", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: "{}" } as never);

    const desired: DesiredBranchProtection = { required_reviews: 2 };
    const diffs: SettingDiff[] = [
      { setting: "required_reviews", current: 1, desired: 2, action: "change" },
    ];
    const diffResult = createDiffResult(diffs, 123);

    await applyBranchProtection(repoInfo, branch, desired, diffResult);

    // Should use PUT for updating existing ruleset
    expect(mockedExeca).toHaveBeenCalledWith(
      "gh",
      ["api", "repos/test-owner/test-repo/rulesets/123", "-X", "PUT", "--input", "-"],
      expect.objectContaining({
        input: expect.any(String),
      })
    );
  });

  it("includes PR review settings in request body", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: "{}" } as never);

    const desired: DesiredBranchProtection = {
      required_reviews: 2,
      dismiss_stale_reviews: true,
      require_code_owner_reviews: true,
    };
    const diffs: SettingDiff[] = [
      { setting: "required_reviews", current: null, desired: 2, action: "add" },
    ];
    const diffResult = createDiffResult(diffs, null);

    await applyBranchProtection(repoInfo, branch, desired, diffResult);

    const callArgs = mockedExeca.mock.calls[0];
    const input = JSON.parse((callArgs[2] as { input: string }).input);

    // Check for pull_request rule in rules array
    const prRule = input.rules.find((r: { type: string }) => r.type === "pull_request");
    expect(prRule).toBeDefined();
    expect(prRule.parameters.required_approving_review_count).toBe(2);
    expect(prRule.parameters.dismiss_stale_reviews_on_push).toBe(true);
    expect(prRule.parameters.require_code_owner_review).toBe(true);
  });

  it("includes status check settings in request body", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: "{}" } as never);

    const desired: DesiredBranchProtection = {
      require_status_checks: ["ci", "test"],
      require_branches_up_to_date: true,
    };
    const diffs: SettingDiff[] = [
      { setting: "require_status_checks", current: [], desired: ["ci", "test"], action: "add" },
    ];
    const diffResult = createDiffResult(diffs, null);

    await applyBranchProtection(repoInfo, branch, desired, diffResult);

    const callArgs = mockedExeca.mock.calls[0];
    const input = JSON.parse((callArgs[2] as { input: string }).input);

    // Check for required_status_checks rule in rules array
    const statusRule = input.rules.find(
      (r: { type: string }) => r.type === "required_status_checks"
    );
    expect(statusRule).toBeDefined();
    expect(statusRule.parameters.required_status_checks).toEqual([
      { context: "ci" },
      { context: "test" },
    ]);
    expect(statusRule.parameters.strict_required_status_checks_policy).toBe(true);
  });

  it("includes required_signatures rule", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: "{}" } as never);

    const desired: DesiredBranchProtection = {
      require_signed_commits: true,
    };
    const diffs: SettingDiff[] = [
      { setting: "require_signed_commits", current: false, desired: true, action: "change" },
    ];
    const diffResult = createDiffResult(diffs, null);

    await applyBranchProtection(repoInfo, branch, desired, diffResult);

    const callArgs = mockedExeca.mock.calls[0];
    const input = JSON.parse((callArgs[2] as { input: string }).input);

    // Check for required_signatures rule in rules array
    const sigRule = input.rules.find((r: { type: string }) => r.type === "required_signatures");
    expect(sigRule).toBeDefined();
  });

  it("throws ApplierError for 403 (no permission)", async () => {
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 403: Must have admin rights"));

    const diffs: SettingDiff[] = [
      { setting: "required_reviews", current: 1, desired: 2, action: "change" },
    ];
    const diffResult = createDiffResult(diffs, null);

    const error = await applyBranchProtection(
      repoInfo,
      branch,
      { required_reviews: 2 },
      diffResult
    ).catch((e) => e);

    expect(error).toBeInstanceOf(ApplierError);
    expect(error.code).toBe("NO_PERMISSION");
  });

  it("returns failure for other API errors", async () => {
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 500: Internal Server Error"));

    const diffs: SettingDiff[] = [
      { setting: "required_reviews", current: 1, desired: 2, action: "change" },
    ];
    const diffResult = createDiffResult(diffs, null);

    const result = await applyBranchProtection(
      repoInfo,
      branch,
      { required_reviews: 2 },
      diffResult
    );

    expect(result.success).toBe(false);
    expect(result.applied).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].diff).toEqual(diffs[0]);
    expect(result.failed[0].error).toContain("HTTP 500");
  });

  it("includes correct ruleset structure in request", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: "{}" } as never);

    const desired: DesiredBranchProtection = { required_reviews: 1 };
    const diffs: SettingDiff[] = [
      { setting: "required_reviews", current: null, desired: 1, action: "add" },
    ];
    const diffResult = createDiffResult(diffs, null);

    await applyBranchProtection(repoInfo, branch, desired, diffResult);

    const callArgs = mockedExeca.mock.calls[0];
    const input = JSON.parse((callArgs[2] as { input: string }).input);

    // Check ruleset structure
    expect(input.name).toBe("Branch Protection");
    expect(input.target).toBe("branch");
    expect(input.enforcement).toBe("active");
    expect(input.conditions.ref_name.include).toEqual(["refs/heads/main"]);
    expect(input.bypass_actors).toEqual([]);
  });
});

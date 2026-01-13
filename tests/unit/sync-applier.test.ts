import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

import { ApplierError, applyBranchProtection } from "../../src/process/sync/applier.js";
import type { DesiredBranchProtection, SettingDiff } from "../../src/process/sync/types.js";

const mockedExeca = vi.mocked(execa);

describe("applyBranchProtection", () => {
  const repoInfo = { owner: "test-owner", repo: "test-repo" };
  const branch = "main";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with no diffs", async () => {
    const result = await applyBranchProtection(repoInfo, branch, {}, []);

    expect(result).toEqual({ success: true, applied: [], failed: [] });
    expect(mockedExeca).not.toHaveBeenCalled();
  });

  it("applies changes successfully", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: "{}" } as never);

    const desired: DesiredBranchProtection = { required_reviews: 2 };
    const diffs: SettingDiff[] = [
      { setting: "required_reviews", current: 1, desired: 2, action: "change" },
    ];

    const result = await applyBranchProtection(repoInfo, branch, desired, diffs);

    expect(result.success).toBe(true);
    expect(result.applied).toEqual(diffs);
    expect(result.failed).toHaveLength(0);
    expect(mockedExeca).toHaveBeenCalledWith(
      "gh",
      [
        "api",
        "repos/test-owner/test-repo/branches/main/protection",
        "-X",
        "PUT",
        "--input",
        "-",
      ],
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

    await applyBranchProtection(repoInfo, branch, desired, diffs);

    const callArgs = mockedExeca.mock.calls[0];
    const input = JSON.parse((callArgs[2] as { input: string }).input);

    expect(input.required_pull_request_reviews).toEqual({
      required_approving_review_count: 2,
      dismiss_stale_reviews: true,
      require_code_owner_reviews: true,
    });
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

    await applyBranchProtection(repoInfo, branch, desired, diffs);

    const callArgs = mockedExeca.mock.calls[0];
    const input = JSON.parse((callArgs[2] as { input: string }).input);

    expect(input.required_status_checks).toEqual({
      contexts: ["ci", "test"],
      strict: true,
    });
  });

  it("includes enforce_admins and required_signatures", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: "{}" } as never);

    const desired: DesiredBranchProtection = {
      enforce_admins: true,
      require_signed_commits: true,
    };
    const diffs: SettingDiff[] = [
      { setting: "enforce_admins", current: false, desired: true, action: "change" },
    ];

    await applyBranchProtection(repoInfo, branch, desired, diffs);

    const callArgs = mockedExeca.mock.calls[0];
    const input = JSON.parse((callArgs[2] as { input: string }).input);

    expect(input.enforce_admins).toBe(true);
    expect(input.required_signatures).toBe(true);
  });

  it("throws ApplierError for 403 (no permission)", async () => {
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 403: Must have admin rights"));

    const diffs: SettingDiff[] = [
      { setting: "required_reviews", current: 1, desired: 2, action: "change" },
    ];

    const error = await applyBranchProtection(
      repoInfo,
      branch,
      { required_reviews: 2 },
      diffs
    ).catch((e) => e);

    expect(error).toBeInstanceOf(ApplierError);
    expect(error.code).toBe("NO_PERMISSION");
  });

  it("returns failure for other API errors", async () => {
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 500: Internal Server Error"));

    const diffs: SettingDiff[] = [
      { setting: "required_reviews", current: 1, desired: 2, action: "change" },
    ];

    const result = await applyBranchProtection(
      repoInfo,
      branch,
      { required_reviews: 2 },
      diffs
    );

    expect(result.success).toBe(false);
    expect(result.applied).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].diff).toEqual(diffs[0]);
    expect(result.failed[0].error).toContain("HTTP 500");
  });

  it("includes default safety fields in request", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: "{}" } as never);

    const desired: DesiredBranchProtection = { required_reviews: 1 };
    const diffs: SettingDiff[] = [
      { setting: "required_reviews", current: null, desired: 1, action: "add" },
    ];

    await applyBranchProtection(repoInfo, branch, desired, diffs);

    const callArgs = mockedExeca.mock.calls[0];
    const input = JSON.parse((callArgs[2] as { input: string }).input);

    expect(input.restrictions).toBeNull();
    expect(input.required_linear_history).toBe(false);
    expect(input.allow_force_pushes).toBe(false);
    expect(input.allow_deletions).toBe(false);
  });
});

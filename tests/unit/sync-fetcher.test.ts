import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

import {
  fetchBranchProtection,
  FetcherError,
  getRepoInfo,
  isGhAvailable,
} from "../../src/process/sync/fetcher.js";

const mockedExeca = vi.mocked(execa);

// Helper to create a branch ruleset response
const createBranchRuleset = (
  branch: string,
  rules: Array<{ type: string; parameters?: Record<string, unknown> }>,
  bypassActors: Array<{ actor_id: number | null; actor_type: string; bypass_mode: string }> = []
) => [
  {
    id: 1,
    name: "Branch Protection",
    target: "branch",
    enforcement: "active",
    conditions: { ref_name: { include: [`refs/heads/${branch}`] } },
    bypass_actors: bypassActors,
    rules,
  },
];

describe("isGhAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when gh CLI is available", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: "gh version 2.0.0" } as never);

    const result = await isGhAvailable();

    expect(result).toBe(true);
    expect(mockedExeca).toHaveBeenCalledWith("gh", ["--version"]);
  });

  it("returns false when gh CLI is not available", async () => {
    mockedExeca.mockRejectedValueOnce(new Error("command not found: gh"));

    const result = await isGhAvailable();

    expect(result).toBe(false);
  });
});

describe("getRepoInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns owner and repo from gh repo view", async () => {
    mockedExeca.mockResolvedValueOnce({
      stdout: JSON.stringify({ owner: { login: "myorg" }, name: "myrepo" }),
    } as never);

    const result = await getRepoInfo("/path/to/project");

    expect(result).toEqual({ owner: "myorg", repo: "myrepo" });
    expect(mockedExeca).toHaveBeenCalledWith("gh", ["repo", "view", "--json", "owner,name"], {
      cwd: "/path/to/project",
    });
  });

  it("throws FetcherError when not in a GitHub repository", async () => {
    mockedExeca.mockRejectedValueOnce(new Error("not a git repository"));

    await expect(getRepoInfo("/path/to/project")).rejects.toThrow(FetcherError);
    await expect(getRepoInfo("/path/to/project")).rejects.toMatchObject({
      code: "NO_REPO",
    });
  });
});

describe("fetchBranchProtection", () => {
  const repoInfo = { owner: "test-owner", repo: "test-repo" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("parses branch protection ruleset response correctly", async () => {
    mockedExeca.mockResolvedValueOnce({
      stdout: JSON.stringify(
        createBranchRuleset("main", [
          {
            type: "pull_request",
            parameters: {
              required_approving_review_count: 2,
              dismiss_stale_reviews_on_push: true,
              require_code_owner_review: true,
            },
          },
          {
            type: "required_status_checks",
            parameters: {
              strict_required_status_checks_policy: true,
              required_status_checks: [{ context: "ci" }, { context: "test" }],
            },
          },
          { type: "required_signatures" },
        ])
      ),
    } as never);

    const result = await fetchBranchProtection(repoInfo, "main");

    expect(result).toEqual({
      branch: "main",
      requiredReviews: 2,
      dismissStaleReviews: true,
      requireCodeOwnerReviews: true,
      requiredStatusChecks: ["ci", "test"],
      requireBranchesUpToDate: true,
      requireSignedCommits: true,
      enforceAdmins: true, // true because no bypass actors
      bypassActors: null,
      rulesetId: 1,
      rulesetName: "Branch Protection",
    });
  });

  it("handles missing optional fields", async () => {
    mockedExeca.mockResolvedValueOnce({
      stdout: JSON.stringify(
        createBranchRuleset("main", [
          {
            type: "pull_request",
            parameters: {
              required_approving_review_count: 1,
            },
          },
        ])
      ),
    } as never);

    const result = await fetchBranchProtection(repoInfo, "main");

    expect(result.requiredReviews).toBe(1);
    expect(result.dismissStaleReviews).toBeNull();
    expect(result.requiredStatusChecks).toBeNull();
  });

  it("returns empty settings for 404 (no rulesets)", async () => {
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 404"));

    const result = await fetchBranchProtection(repoInfo, "main");

    expect(result).toEqual({
      branch: "main",
      requiredReviews: null,
      dismissStaleReviews: null,
      requireCodeOwnerReviews: null,
      requiredStatusChecks: null,
      requireBranchesUpToDate: null,
      requireSignedCommits: null,
      enforceAdmins: null,
      bypassActors: null,
      rulesetId: null,
      rulesetName: null,
    });
  });

  it("returns empty settings when no matching branch ruleset exists", async () => {
    mockedExeca.mockResolvedValueOnce({
      stdout: JSON.stringify([
        {
          id: 1,
          name: "Tag Protection",
          target: "tag", // Not a branch ruleset
          enforcement: "active",
          rules: [],
        },
      ]),
    } as never);

    const result = await fetchBranchProtection(repoInfo, "main");

    expect(result.rulesetId).toBeNull();
    expect(result.requiredReviews).toBeNull();
  });

  it("throws FetcherError for 403 (no permission)", async () => {
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 403: Must have admin rights"));

    const error = await fetchBranchProtection(repoInfo, "main").catch((e) => e);
    expect(error).toBeInstanceOf(FetcherError);
    expect(error.code).toBe("NO_PERMISSION");
  });

  it("throws FetcherError for other API errors", async () => {
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 500: Internal Server Error"));

    const error = await fetchBranchProtection(repoInfo, "main").catch((e) => e);
    expect(error).toBeInstanceOf(FetcherError);
    expect(error.code).toBe("API_ERROR");
  });

  it("parses bypass actors correctly", async () => {
    mockedExeca.mockResolvedValueOnce({
      stdout: JSON.stringify(
        createBranchRuleset(
          "main",
          [],
          [
            { actor_id: 123, actor_type: "Integration", bypass_mode: "always" },
            { actor_id: 5, actor_type: "RepositoryRole", bypass_mode: "pull_request" },
          ]
        )
      ),
    } as never);

    const result = await fetchBranchProtection(repoInfo, "main");

    expect(result.bypassActors).toEqual([
      { actor_type: "Integration", actor_id: 123, bypass_mode: "always" },
      { actor_type: "RepositoryRole", actor_id: 5, bypass_mode: "pull_request" },
    ]);
    expect(result.enforceAdmins).toBe(false); // false because there are bypass actors
  });
});

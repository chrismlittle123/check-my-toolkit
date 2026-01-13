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

  it("parses branch protection response correctly", async () => {
    mockedExeca.mockResolvedValueOnce({
      stdout: JSON.stringify({
        required_pull_request_reviews: {
          required_approving_review_count: 2,
          dismiss_stale_reviews: true,
          require_code_owner_reviews: true,
        },
        required_status_checks: {
          strict: true,
          contexts: ["ci", "test"],
        },
        required_signatures: { enabled: true },
        enforce_admins: { enabled: true },
      }),
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
      enforceAdmins: true,
    });
  });

  it("handles missing optional fields", async () => {
    mockedExeca.mockResolvedValueOnce({
      stdout: JSON.stringify({
        required_pull_request_reviews: {
          required_approving_review_count: 1,
        },
      }),
    } as never);

    const result = await fetchBranchProtection(repoInfo, "main");

    expect(result.requiredReviews).toBe(1);
    expect(result.dismissStaleReviews).toBeNull();
    expect(result.requiredStatusChecks).toBeNull();
  });

  it("returns empty settings for 404 (not protected)", async () => {
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 404: Branch not protected"));

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
    });
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
});

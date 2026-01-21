import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

import {
  checkRemoteFileExists,
  checkRemoteFiles,
  isGhAvailable,
  parseRepoString,
  RemoteFetcherError,
  standardFileChecks,
  verifyRepoAccess,
} from "../../src/process/scan/remote-fetcher.js";
import { scanRepository } from "../../src/process/scan/scanner.js";
import { type Config } from "../../src/config/index.js";

const mockedExeca = vi.mocked(execa);

describe("parseRepoString", () => {
  it("parses valid owner/repo format", () => {
    const result = parseRepoString("myorg/myrepo");
    expect(result).toEqual({ owner: "myorg", repo: "myrepo" });
  });

  it("throws for invalid format without slash", () => {
    expect(() => parseRepoString("invalid")).toThrow(RemoteFetcherError);
    expect(() => parseRepoString("invalid")).toThrow('Expected "owner/repo" format');
  });

  it("throws for empty owner", () => {
    expect(() => parseRepoString("/repo")).toThrow(RemoteFetcherError);
  });

  it("throws for empty repo", () => {
    expect(() => parseRepoString("owner/")).toThrow(RemoteFetcherError);
  });

  it("throws for multiple slashes", () => {
    expect(() => parseRepoString("owner/repo/extra")).toThrow(RemoteFetcherError);
  });
});

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

describe("verifyRepoAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when repository exists and is accessible", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: '{"id": 123}' } as never);

    const result = await verifyRepoAccess({ owner: "myorg", repo: "myrepo" });

    expect(result).toBe(true);
    expect(mockedExeca).toHaveBeenCalledWith("gh", ["api", "repos/myorg/myrepo"]);
  });

  it("throws NO_REPO for 404 responses", async () => {
    mockedExeca.mockRejectedValue(new Error("HTTP 404: Not Found"));

    const error = await verifyRepoAccess({ owner: "myorg", repo: "nonexistent" }).catch((e) => e);
    expect(error).toBeInstanceOf(RemoteFetcherError);
    expect(error.code).toBe("NO_REPO");
  });

  it("throws NO_PERMISSION for 403 responses", async () => {
    mockedExeca.mockRejectedValue(new Error("HTTP 403: Forbidden"));

    const error = await verifyRepoAccess({ owner: "myorg", repo: "private" }).catch((e) => e);
    expect(error).toBeInstanceOf(RemoteFetcherError);
    expect(error.code).toBe("NO_PERMISSION");
  });

  it("throws API_ERROR for other errors", async () => {
    mockedExeca.mockRejectedValue(new Error("Network error"));

    const error = await verifyRepoAccess({ owner: "myorg", repo: "myrepo" }).catch((e) => e);
    expect(error).toBeInstanceOf(RemoteFetcherError);
    expect(error.code).toBe("API_ERROR");
  });
});

describe("checkRemoteFileExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when file exists", async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: '{"type": "file"}' } as never);

    const result = await checkRemoteFileExists({ owner: "myorg", repo: "myrepo" }, "README.md");

    expect(result).toBe(true);
    expect(mockedExeca).toHaveBeenCalledWith("gh", [
      "api",
      "repos/myorg/myrepo/contents/README.md",
      "--silent",
    ]);
  });

  it("returns false when file does not exist", async () => {
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 404"));

    const result = await checkRemoteFileExists({ owner: "myorg", repo: "myrepo" }, "NONEXISTENT.md");

    expect(result).toBe(false);
  });
});

describe("checkRemoteFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks multiple files in parallel", async () => {
    mockedExeca
      .mockResolvedValueOnce({ stdout: '{"type": "file"}' } as never) // README.md exists
      .mockRejectedValueOnce(new Error("HTTP 404")); // CODEOWNERS doesn't exist

    const configs = [
      { path: "README.md", required: false, description: "README" },
      { path: "CODEOWNERS", required: true, description: "CODEOWNERS" },
    ];

    const results = await checkRemoteFiles({ owner: "myorg", repo: "myrepo" }, configs);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ path: "README.md", exists: true, checkedPaths: ["README.md"] });
    expect(results[1]).toEqual({ path: "CODEOWNERS", exists: false, checkedPaths: ["CODEOWNERS"] });
  });

  it("checks alternative paths when primary doesn't exist", async () => {
    mockedExeca
      .mockRejectedValueOnce(new Error("HTTP 404")) // CODEOWNERS doesn't exist
      .mockResolvedValueOnce({ stdout: '{"type": "file"}' } as never); // .github/CODEOWNERS exists

    const configs = [
      {
        path: "CODEOWNERS",
        alternativePaths: [".github/CODEOWNERS", "docs/CODEOWNERS"],
        required: true,
        description: "CODEOWNERS",
      },
    ];

    const results = await checkRemoteFiles({ owner: "myorg", repo: "myrepo" }, configs);

    expect(results[0].exists).toBe(true);
    expect(results[0].checkedPaths).toEqual([
      "CODEOWNERS",
      ".github/CODEOWNERS",
      "docs/CODEOWNERS",
    ]);
  });
});

describe("standardFileChecks", () => {
  it("includes standard files", () => {
    expect(standardFileChecks.length).toBeGreaterThan(0);

    const paths = standardFileChecks.map((c) => c.path);
    expect(paths).toContain("CODEOWNERS");
    expect(paths).toContain("README.md");
  });

  it("has alternative paths for CODEOWNERS", () => {
    const codeowners = standardFileChecks.find((c) => c.path === "CODEOWNERS");
    expect(codeowners?.alternativePaths).toContain(".github/CODEOWNERS");
    expect(codeowners?.alternativePaths).toContain("docs/CODEOWNERS");
  });
});

describe("scanRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when gh CLI is not available", async () => {
    mockedExeca.mockRejectedValue(new Error("command not found: gh"));

    const config: Config = {};

    const error = await scanRepository("myorg/myrepo", config).catch((e) => e);
    expect(error).toBeInstanceOf(RemoteFetcherError);
    expect(error.code).toBe("NO_GH");
  });

  it("throws for invalid repo format", async () => {
    const error = await scanRepository("invalid", {} as Config).catch((e) => e);
    expect(error).toBeInstanceOf(RemoteFetcherError);
    expect(error.code).toBe("INVALID_REPO");
  });

  it("returns scan result when repo is accessible", async () => {
    // Mock gh --version
    mockedExeca.mockResolvedValueOnce({ stdout: "gh version 2.0.0" } as never);
    // Mock repo access verification
    mockedExeca.mockResolvedValueOnce({ stdout: '{"id": 123}' } as never);
    // Mock rulesets API (empty)
    mockedExeca.mockResolvedValueOnce({ stdout: "[]" } as never);
    // Mock file checks - README exists
    mockedExeca.mockResolvedValueOnce({ stdout: '{"type": "file"}' } as never);
    // Mock file checks - others don't exist
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 404"));
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 404"));
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 404"));

    const config: Config = {
      process: {
        repo: {
          enabled: false,
        },
      },
    };

    const result = await scanRepository("myorg/myrepo", config);

    expect(result.repoInfo).toEqual({ owner: "myorg", repo: "myrepo" });
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it("detects missing branch protection when required", async () => {
    // Mock gh --version
    mockedExeca.mockResolvedValueOnce({ stdout: "gh version 2.0.0" } as never);
    // Mock repo access verification
    mockedExeca.mockResolvedValueOnce({ stdout: '{"id": 123}' } as never);
    // Mock rulesets API (empty - no protection)
    mockedExeca.mockResolvedValueOnce({ stdout: "[]" } as never);
    // Mock file checks
    mockedExeca.mockResolvedValueOnce({ stdout: '{"type": "file"}' } as never);
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 404"));
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 404"));
    mockedExeca.mockRejectedValueOnce(new Error("HTTP 404"));

    const config: Config = {
      process: {
        repo: {
          enabled: true,
          require_branch_protection: true,
          ruleset: {
            branch: "main",
          },
        },
      },
    };

    const result = await scanRepository("myorg/myrepo", config);

    expect(result.passed).toBe(false);
    const repoCheck = result.checks.find((c) => c.rule === "process.repo");
    expect(repoCheck?.violations).toContainEqual(
      expect.objectContaining({
        rule: "process.repo.branch_protection",
        message: expect.stringContaining("branch protection"),
      })
    );
  });

  it("detects missing CODEOWNERS when required", async () => {
    // Mock gh --version
    mockedExeca.mockResolvedValueOnce({ stdout: "gh version 2.0.0" } as never);
    // Mock repo access verification
    mockedExeca.mockResolvedValueOnce({ stdout: '{"id": 123}' } as never);
    // Mock rulesets API
    mockedExeca.mockResolvedValueOnce({ stdout: "[]" } as never);
    // Mock file checks - all files don't exist
    mockedExeca.mockRejectedValue(new Error("HTTP 404"));

    const config: Config = {
      process: {
        repo: {
          enabled: true,
          require_codeowners: true,
        },
      },
    };

    const result = await scanRepository("myorg/myrepo", config);

    expect(result.passed).toBe(false);
    const filesCheck = result.checks.find((c) => c.rule === "process.scan.files");
    expect(filesCheck?.violations).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining("CODEOWNERS"),
      })
    );
  });

  it("passes when all checks pass", async () => {
    // Mock gh --version
    mockedExeca.mockResolvedValueOnce({ stdout: "gh version 2.0.0" } as never);
    // Mock repo access verification
    mockedExeca.mockResolvedValueOnce({ stdout: '{"id": 123}' } as never);
    // Mock rulesets API with branch protection
    mockedExeca.mockResolvedValueOnce({
      stdout: JSON.stringify([
        {
          id: 1,
          name: "Branch Protection",
          target: "branch",
          enforcement: "active",
          conditions: { ref_name: { include: ["refs/heads/main"] } },
          rules: [
            {
              type: "pull_request",
              parameters: { required_approving_review_count: 1 },
            },
          ],
        },
      ]),
    } as never);
    // Mock file checks - all required files exist
    mockedExeca.mockResolvedValue({ stdout: '{"type": "file"}' } as never);

    const config: Config = {
      process: {
        repo: {
          enabled: true,
          require_branch_protection: true,
          require_codeowners: true,
          ruleset: {
            branch: "main",
            required_reviews: 1,
          },
        },
      },
    };

    const result = await scanRepository("myorg/myrepo", config);

    expect(result.passed).toBe(true);
    expect(result.summary.failedChecks).toBe(0);
  });
});

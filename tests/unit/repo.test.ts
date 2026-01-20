import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RepoRunner } from "../../src/process/tools/repo.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("RepoRunner", () => {
  let tempDir: string;
  let runner: RepoRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-repo-test-"));
    runner = new RepoRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("metadata", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Repository");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("process.repo");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("repo");
    });

    it("has empty configFiles", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("run", () => {
    describe("gh CLI not available", () => {
      it("skips when gh CLI is not installed", async () => {
        mockedExeca.mockRejectedValueOnce(new Error("command not found: gh"));
        runner.setConfig({ enabled: true, require_codeowners: true });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("GitHub CLI (gh) not available");
      });
    });

    describe("repo info not available", () => {
      it("skips when not in a GitHub repository", async () => {
        // gh --version succeeds
        mockedExeca.mockResolvedValueOnce({ stdout: "gh version 2.0.0" } as never);
        // gh repo view fails (not a repo)
        mockedExeca.mockRejectedValueOnce(new Error("not a git repository"));
        runner.setConfig({ enabled: true, require_codeowners: true });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Could not determine GitHub repository");
      });
    });

    describe("CODEOWNERS check", () => {
      beforeEach(() => {
        // gh --version succeeds
        mockedExeca.mockResolvedValueOnce({ stdout: "gh version 2.0.0" } as never);
        // gh repo view succeeds
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({ owner: { login: "testorg" }, name: "testrepo" }),
        } as never);
      });

      it("passes when CODEOWNERS exists in root", async () => {
        fs.writeFileSync(path.join(tempDir, "CODEOWNERS"), "* @owner");
        runner.setConfig({ enabled: true, require_codeowners: true });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("passes when CODEOWNERS exists in .github/", async () => {
        fs.mkdirSync(path.join(tempDir, ".github"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, ".github", "CODEOWNERS"), "* @owner");
        runner.setConfig({ enabled: true, require_codeowners: true });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("passes when CODEOWNERS exists in docs/", async () => {
        fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "docs", "CODEOWNERS"), "* @owner");
        runner.setConfig({ enabled: true, require_codeowners: true });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when CODEOWNERS is missing", async () => {
        runner.setConfig({ enabled: true, require_codeowners: true });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.repo.codeowners");
        expect(result.violations[0].message).toContain("CODEOWNERS file not found");
      });

      it("passes when CODEOWNERS check is disabled", async () => {
        runner.setConfig({ enabled: true, require_codeowners: false });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });
    });

    describe("branch protection check", () => {
      beforeEach(() => {
        // gh --version succeeds
        mockedExeca.mockResolvedValueOnce({ stdout: "gh version 2.0.0" } as never);
        // gh repo view succeeds
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({ owner: { login: "testorg" }, name: "testrepo" }),
        } as never);
      });

      it("fails when branch protection is not enabled", async () => {
        // gh api returns 404
        mockedExeca.mockRejectedValueOnce(new Error("404 Branch not protected"));
        runner.setConfig({ enabled: true, require_branch_protection: true });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.repo.branch_protection");
        expect(result.violations[0].message).toContain("does not have branch protection enabled");
      });

      it("warns when insufficient permissions", async () => {
        // gh api returns 403
        mockedExeca.mockRejectedValueOnce(new Error("403 Must have admin rights"));
        runner.setConfig({ enabled: true, require_branch_protection: true });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].severity).toBe("warning");
        expect(result.violations[0].message).toContain("insufficient permissions");
      });

      it("passes when branch protection exists and no specific requirements", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({
            required_pull_request_reviews: { required_approving_review_count: 1 },
          }),
        } as never);
        runner.setConfig({ enabled: true, require_branch_protection: true });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when required reviews not met", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({
            required_pull_request_reviews: { required_approving_review_count: 1 },
          }),
        } as never);
        runner.setConfig({
          enabled: true,
          branch_protection: { required_reviews: 2 },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.rule.includes("required_reviews"))).toBe(true);
      });

      it("passes when required reviews met", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({
            required_pull_request_reviews: { required_approving_review_count: 2 },
          }),
        } as never);
        runner.setConfig({
          enabled: true,
          branch_protection: { required_reviews: 2 },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when dismiss_stale_reviews not enabled", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({
            required_pull_request_reviews: { dismiss_stale_reviews: false },
          }),
        } as never);
        runner.setConfig({
          enabled: true,
          branch_protection: { dismiss_stale_reviews: true },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.rule.includes("dismiss_stale_reviews"))).toBe(true);
      });

      it("fails when require_code_owner_reviews not enabled", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({
            required_pull_request_reviews: { require_code_owner_reviews: false },
          }),
        } as never);
        runner.setConfig({
          enabled: true,
          branch_protection: { require_code_owner_reviews: true },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.rule.includes("require_code_owner_reviews"))).toBe(
          true
        );
      });

      it("fails when required status checks are missing", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({
            required_status_checks: { contexts: ["ci"] },
          }),
        } as never);
        runner.setConfig({
          enabled: true,
          branch_protection: { require_status_checks: ["ci", "lint", "test"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.message.includes("lint, test"))).toBe(true);
      });

      it("passes when all required status checks present", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({
            required_status_checks: { contexts: ["ci", "lint", "test"] },
          }),
        } as never);
        runner.setConfig({
          enabled: true,
          branch_protection: { require_status_checks: ["ci", "lint"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when require_branches_up_to_date not enabled", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({
            required_status_checks: { strict: false },
          }),
        } as never);
        runner.setConfig({
          enabled: true,
          branch_protection: { require_branches_up_to_date: true },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.rule.includes("require_branches_up_to_date"))).toBe(
          true
        );
      });

      it("fails when require_signed_commits not enabled", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({
            required_signatures: { enabled: false },
          }),
        } as never);
        runner.setConfig({
          enabled: true,
          branch_protection: { require_signed_commits: true },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.rule.includes("require_signed_commits"))).toBe(true);
      });

      it("fails when enforce_admins not enabled", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({
            enforce_admins: { enabled: false },
          }),
        } as never);
        runner.setConfig({
          enabled: true,
          branch_protection: { enforce_admins: true },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.rule.includes("enforce_admins"))).toBe(true);
      });

      it("uses custom branch name", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({
            required_pull_request_reviews: { required_approving_review_count: 1 },
          }),
        } as never);
        runner.setConfig({
          enabled: true,
          branch_protection: { branch: "develop", required_reviews: 1 },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        // Verify the API was called with the custom branch
        expect(mockedExeca).toHaveBeenCalledWith(
          "gh",
          expect.arrayContaining([expect.stringContaining("develop/protection")])
        );
      });
    });

    describe("tag protection check", () => {
      beforeEach(() => {
        // gh --version succeeds
        mockedExeca.mockResolvedValueOnce({ stdout: "gh version 2.0.0" } as never);
        // gh repo view succeeds
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify({ owner: { login: "testorg" }, name: "testrepo" }),
        } as never);
      });

      it("passes when tag protection ruleset exists with correct patterns", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify([
            {
              id: 1,
              name: "Tag Protection",
              target: "tag",
              enforcement: "active",
              conditions: { ref_name: { include: ["refs/tags/v*"] } },
              rules: [{ type: "deletion" }, { type: "update" }],
            },
          ]),
        } as never);
        runner.setConfig({
          enabled: true,
          tag_protection: { patterns: ["v*"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when no tag protection ruleset exists", async () => {
        mockedExeca.mockResolvedValueOnce({ stdout: "[]" } as never);
        runner.setConfig({
          enabled: true,
          tag_protection: { patterns: ["v*"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.repo.tag_protection");
        expect(result.violations[0].message).toContain("No active tag protection ruleset");
      });

      it("fails when patterns do not match", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify([
            {
              id: 1,
              name: "Tag Protection",
              target: "tag",
              enforcement: "active",
              conditions: { ref_name: { include: ["refs/tags/release-*"] } },
              rules: [{ type: "deletion" }, { type: "update" }],
            },
          ]),
        } as never);
        runner.setConfig({
          enabled: true,
          tag_protection: { patterns: ["v*"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.rule.includes("patterns"))).toBe(true);
        expect(result.violations[0].message).toContain("patterns mismatch");
      });

      it("fails when prevent_deletion rule is missing", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify([
            {
              id: 1,
              name: "Tag Protection",
              target: "tag",
              enforcement: "active",
              conditions: { ref_name: { include: ["refs/tags/v*"] } },
              rules: [{ type: "update" }], // missing deletion
            },
          ]),
        } as never);
        runner.setConfig({
          enabled: true,
          tag_protection: { patterns: ["v*"], prevent_deletion: true },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.rule.includes("prevent_deletion"))).toBe(true);
      });

      it("fails when prevent_update rule is missing", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify([
            {
              id: 1,
              name: "Tag Protection",
              target: "tag",
              enforcement: "active",
              conditions: { ref_name: { include: ["refs/tags/v*"] } },
              rules: [{ type: "deletion" }], // missing update
            },
          ]),
        } as never);
        runner.setConfig({
          enabled: true,
          tag_protection: { patterns: ["v*"], prevent_update: true },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.rule.includes("prevent_update"))).toBe(true);
      });

      it("warns when insufficient permissions", async () => {
        mockedExeca.mockRejectedValueOnce(new Error("403 Must have admin rights"));
        runner.setConfig({
          enabled: true,
          tag_protection: { patterns: ["v*"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].severity).toBe("warning");
        expect(result.violations[0].message).toContain("insufficient permissions");
      });

      it("skips tag protection when no patterns configured", async () => {
        runner.setConfig({
          enabled: true,
          tag_protection: { patterns: [] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("handles multiple tag patterns", async () => {
        mockedExeca.mockResolvedValueOnce({
          stdout: JSON.stringify([
            {
              id: 1,
              name: "Tag Protection",
              target: "tag",
              enforcement: "active",
              conditions: { ref_name: { include: ["refs/tags/v*", "refs/tags/release-*"] } },
              rules: [{ type: "deletion" }, { type: "update" }],
            },
          ]),
        } as never);
        runner.setConfig({
          enabled: true,
          tag_protection: { patterns: ["v*", "release-*"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });
    });
  });

  describe("audit", () => {
    it("returns same result as run", async () => {
      mockedExeca.mockResolvedValueOnce({ stdout: "gh version 2.0.0" } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({ owner: { login: "testorg" }, name: "testrepo" }),
      } as never);
      fs.writeFileSync(path.join(tempDir, "CODEOWNERS"), "* @owner");
      runner.setConfig({ enabled: true, require_codeowners: true });

      const runResult = await runner.run(tempDir);

      // Reset mocks for audit call
      mockedExeca.mockResolvedValueOnce({ stdout: "gh version 2.0.0" } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({ owner: { login: "testorg" }, name: "testrepo" }),
      } as never);

      const auditResult = await runner.audit(tempDir);
      expect(auditResult.passed).toBe(runResult.passed);
    });
  });
});

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BranchesRunner } from "../../src/process/tools/branches.js";

describe("BranchesRunner", () => {
  let tempDir: string;
  let runner: BranchesRunner;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-branches-test-"));
    runner = new BranchesRunner();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /** Helper to initialize a git repo with a specific branch */
  async function initGitRepo(branchName: string): Promise<void> {
    const { execa } = await import("execa");
    await execa("git", ["init"], { cwd: tempDir });
    await execa("git", ["config", "user.email", "test@test.com"], { cwd: tempDir });
    await execa("git", ["config", "user.name", "Test"], { cwd: tempDir });
    // Create initial commit
    fs.writeFileSync(path.join(tempDir, "README.md"), "# Test");
    await execa("git", ["add", "."], { cwd: tempDir });
    await execa("git", ["commit", "-m", "Initial commit"], { cwd: tempDir });
    // Create and checkout branch if not main
    if (branchName !== "main" && branchName !== "master") {
      await execa("git", ["checkout", "-b", branchName], { cwd: tempDir });
    }
  }

  describe("metadata", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Branches");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("process.branches");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("branches");
    });

    it("has empty configFiles", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("run", () => {
    describe("not in git repo", () => {
      it("skips when not in a git repository", async () => {
        runner.setConfig({
          enabled: true,
          pattern: "^feature/.*$",
        });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Not in a git repository");
      });
    });

    describe("pattern matching", () => {
      it("passes when branch matches pattern", async () => {
        await initGitRepo("feature/v1.0.0/add-feature");
        runner.setConfig({
          enabled: true,
          pattern: "^feature/v[0-9]+\\.[0-9]+\\.[0-9]+/[a-z0-9-]+$",
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when branch does not match pattern", async () => {
        await initGitRepo("my-branch");
        runner.setConfig({
          enabled: true,
          pattern: "^feature/v[0-9]+\\.[0-9]+\\.[0-9]+/[a-z0-9-]+$",
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("my-branch");
        expect(result.violations[0].message).toContain("does not match pattern");
      });

      it("handles complex patterns", async () => {
        await initGitRepo("fix/v0.1.3/eslint-parsing-error");
        runner.setConfig({
          enabled: true,
          pattern: "^(feature|fix|hotfix|docs)/v[0-9]+\\.[0-9]+\\.[0-9]+/[a-z0-9-]+$",
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("handles invalid regex pattern", async () => {
        await initGitRepo("feature/test");
        runner.setConfig({
          enabled: true,
          pattern: "[invalid(regex",
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].message).toContain("Invalid regex pattern");
      });
    });

    describe("exclude list", () => {
      it("passes when branch is in exclude list", async () => {
        await initGitRepo("main");
        runner.setConfig({
          enabled: true,
          pattern: "^feature/.*$",
          exclude: ["main", "master", "develop"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("still validates when branch is not in exclude list", async () => {
        await initGitRepo("my-branch");
        runner.setConfig({
          enabled: true,
          pattern: "^feature/.*$",
          exclude: ["main", "master"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
      });
    });

    describe("no validation configured", () => {
      it("skips when no pattern or issue requirement is configured", async () => {
        await initGitRepo("feature/test");
        runner.setConfig({
          enabled: true,
        });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("No branch pattern or issue requirement configured");
      });
    });

    describe("require_issue validation", () => {
      it("passes when branch contains issue number", async () => {
        await initGitRepo("feature/123/add-login");
        runner.setConfig({
          enabled: true,
          require_issue: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("passes with fix branch containing issue number", async () => {
        await initGitRepo("fix/456/broken-button");
        runner.setConfig({
          enabled: true,
          require_issue: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("passes with hotfix branch containing issue number", async () => {
        await initGitRepo("hotfix/789/security-patch");
        runner.setConfig({
          enabled: true,
          require_issue: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("passes with docs branch containing issue number", async () => {
        await initGitRepo("docs/42/update-readme");
        runner.setConfig({
          enabled: true,
          require_issue: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("fails when branch does not contain issue number", async () => {
        await initGitRepo("feature/add-login");
        runner.setConfig({
          enabled: true,
          require_issue: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.branches.require_issue");
        expect(result.violations[0].message).toContain("does not contain issue number");
      });

      it("fails when branch has wrong format", async () => {
        await initGitRepo("123/add-login");
        runner.setConfig({
          enabled: true,
          require_issue: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].message).toContain("does not contain issue number");
      });

      it("passes when excluded branch does not have issue number", async () => {
        await initGitRepo("main");
        runner.setConfig({
          enabled: true,
          require_issue: true,
          exclude: ["main", "master"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("uses custom issue_pattern when provided", async () => {
        await initGitRepo("PROJ-123-add-feature");
        runner.setConfig({
          enabled: true,
          require_issue: true,
          issue_pattern: "^PROJ-([0-9]+)-.*$",
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("fails with custom pattern when branch does not match", async () => {
        await initGitRepo("feature/123/add-login");
        runner.setConfig({
          enabled: true,
          require_issue: true,
          issue_pattern: "^PROJ-([0-9]+)-.*$",
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
      });
    });

    describe("combined pattern and require_issue", () => {
      it("validates both pattern and issue requirement", async () => {
        await initGitRepo("feature/123/add-login");
        runner.setConfig({
          enabled: true,
          pattern: "^(feature|fix|hotfix|docs)/([0-9]+)/[a-z0-9-]+$",
          require_issue: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("reports both violations when both fail", async () => {
        await initGitRepo("my-random-branch");
        runner.setConfig({
          enabled: true,
          pattern: "^(feature|fix)/[0-9]+/[a-z-]+$",
          require_issue: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
        expect(result.violations.map((v) => v.rule)).toContain("process.branches.pattern");
        expect(result.violations.map((v) => v.rule)).toContain("process.branches.require_issue");
      });

      it("reports only pattern violation when issue is present but pattern fails", async () => {
        await initGitRepo("feature/123/ADD_LOGIN");
        runner.setConfig({
          enabled: true,
          pattern: "^(feature|fix)/[0-9]+/[a-z-]+$", // no underscores allowed
          require_issue: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.branches.pattern");
      });
    });
  });

  describe("audit", () => {
    it("returns same result as run", async () => {
      await initGitRepo("feature/v1.0.0/test");
      runner.setConfig({
        enabled: true,
        pattern: "^feature/.*$",
      });

      const runResult = await runner.run(tempDir);
      const auditResult = await runner.audit(tempDir);

      expect(auditResult.passed).toBe(runResult.passed);
    });
  });

  describe("setConfig", () => {
    it("merges config with defaults", async () => {
      await initGitRepo("main");
      runner.setConfig({ enabled: true, exclude: ["main"] });

      const result = await runner.run(tempDir);
      // Should pass because main is excluded (no pattern needed)
      expect(result.passed).toBe(true);
    });
  });
});

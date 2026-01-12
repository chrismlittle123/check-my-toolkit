import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { TicketsRunner } from "../../src/process/tools/tickets.js";

describe("TicketsRunner", () => {
  let tempDir: string;
  let runner: TicketsRunner;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-tickets-test-"));
    runner = new TicketsRunner();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /** Helper to initialize a git repo with a specific branch and commit message */
  async function initGitRepo(branchName: string, commitMessage: string): Promise<void> {
    const { execa } = await import("execa");
    await execa("git", ["init"], { cwd: tempDir });
    await execa("git", ["config", "user.email", "test@test.com"], { cwd: tempDir });
    await execa("git", ["config", "user.name", "Test"], { cwd: tempDir });
    // Create initial commit
    fs.writeFileSync(path.join(tempDir, "README.md"), "# Test");
    await execa("git", ["add", "."], { cwd: tempDir });
    await execa("git", ["commit", "-m", commitMessage], { cwd: tempDir });
    // Create and checkout branch if not main
    if (branchName !== "main" && branchName !== "master") {
      await execa("git", ["checkout", "-b", branchName], { cwd: tempDir });
    }
  }

  describe("metadata", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Tickets");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("process.tickets");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("tickets");
    });

    it("has empty configFiles", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("run", () => {
    describe("configuration validation", () => {
      it("skips when no pattern is configured", async () => {
        await initGitRepo("main", "ABC-123: Initial commit");
        runner.setConfig({
          enabled: true,
          require_in_commits: true,
        });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("No ticket pattern configured");
      });

      it("skips when pattern is invalid regex", async () => {
        await initGitRepo("main", "ABC-123: Initial commit");
        runner.setConfig({
          enabled: true,
          pattern: "[invalid(regex",
          require_in_commits: true,
        });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Invalid regex pattern");
      });

      it("skips when neither require_in_commits nor require_in_branch is enabled", async () => {
        await initGitRepo("main", "Initial commit");
        runner.setConfig({
          enabled: true,
          pattern: "ABC-[0-9]+",
          require_in_commits: false,
          require_in_branch: false,
        });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Neither require_in_commits nor require_in_branch is enabled");
      });
    });

    describe("not in git repo", () => {
      it("skips when not in a git repository (require_in_branch)", async () => {
        runner.setConfig({
          enabled: true,
          pattern: "ABC-[0-9]+",
          require_in_branch: true,
          require_in_commits: false,
        });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Not in a git repository");
      });

      it("skips when not in a git repository (require_in_commits)", async () => {
        runner.setConfig({
          enabled: true,
          pattern: "ABC-[0-9]+",
          require_in_commits: true,
        });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Not in a git repository");
      });
    });

    describe("commit message validation", () => {
      it("passes when commit message contains ticket reference", async () => {
        await initGitRepo("main", "ABC-123: Add new feature");
        runner.setConfig({
          enabled: true,
          pattern: "ABC-[0-9]+",
          require_in_commits: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when commit message does not contain ticket reference", async () => {
        await initGitRepo("main", "Add new feature without ticket");
        runner.setConfig({
          enabled: true,
          pattern: "ABC-[0-9]+",
          require_in_commits: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.tickets.commits");
        expect(result.violations[0].message).toContain("does not contain ticket reference");
      });

      it("handles multiple ticket patterns", async () => {
        await initGitRepo("main", "XYZ-456: Fix bug");
        runner.setConfig({
          enabled: true,
          pattern: "(ABC|XYZ)-[0-9]+",
          require_in_commits: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("ticket reference can be anywhere in commit message", async () => {
        await initGitRepo("main", "Fix the bug (ABC-123)");
        runner.setConfig({
          enabled: true,
          pattern: "ABC-[0-9]+",
          require_in_commits: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });
    });

    describe("branch name validation", () => {
      it("passes when branch name contains ticket reference", async () => {
        await initGitRepo("feature/ABC-123-add-feature", "Initial commit");
        runner.setConfig({
          enabled: true,
          pattern: "ABC-[0-9]+",
          require_in_branch: true,
          require_in_commits: false,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when branch name does not contain ticket reference", async () => {
        await initGitRepo("feature/add-new-feature", "Initial commit");
        runner.setConfig({
          enabled: true,
          pattern: "ABC-[0-9]+",
          require_in_branch: true,
          require_in_commits: false,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.tickets.branch");
        expect(result.violations[0].message).toContain("does not contain ticket reference");
      });
    });

    describe("combined validation", () => {
      it("passes when both branch and commit contain ticket reference", async () => {
        await initGitRepo("feature/ABC-123-new-feature", "ABC-123: Add new feature");
        runner.setConfig({
          enabled: true,
          pattern: "ABC-[0-9]+",
          require_in_commits: true,
          require_in_branch: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when only branch contains ticket reference", async () => {
        await initGitRepo("feature/ABC-123-new-feature", "Add new feature");
        runner.setConfig({
          enabled: true,
          pattern: "ABC-[0-9]+",
          require_in_commits: true,
          require_in_branch: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.tickets.commits");
      });

      it("fails when only commit contains ticket reference", async () => {
        await initGitRepo("feature/new-feature", "ABC-123: Add new feature");
        runner.setConfig({
          enabled: true,
          pattern: "ABC-[0-9]+",
          require_in_commits: true,
          require_in_branch: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.tickets.branch");
      });

      it("reports both violations when neither contains ticket reference", async () => {
        await initGitRepo("feature/new-feature", "Add new feature");
        runner.setConfig({
          enabled: true,
          pattern: "ABC-[0-9]+",
          require_in_commits: true,
          require_in_branch: true,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
        expect(result.violations.map((v) => v.rule)).toContain("process.tickets.branch");
        expect(result.violations.map((v) => v.rule)).toContain("process.tickets.commits");
      });
    });
  });

  describe("audit", () => {
    it("returns same result as run", async () => {
      await initGitRepo("main", "ABC-123: Initial commit");
      runner.setConfig({
        enabled: true,
        pattern: "ABC-[0-9]+",
        require_in_commits: true,
      });

      const runResult = await runner.run(tempDir);
      const auditResult = await runner.audit(tempDir);

      expect(auditResult.passed).toBe(runResult.passed);
    });
  });

  describe("setConfig", () => {
    it("merges config with defaults", async () => {
      await initGitRepo("main", "ABC-123: Test");
      runner.setConfig({ enabled: true, pattern: "ABC-[0-9]+" });

      const result = await runner.run(tempDir);
      // Should pass because require_in_commits defaults to true and message has ticket
      expect(result.passed).toBe(true);
    });
  });
});

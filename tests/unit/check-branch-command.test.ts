import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkBranchCommand } from "../../src/process/commands/check-branch.js";

// Mock console methods
const mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

describe("checkBranchCommand", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-check-branch-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /** Helper to initialize a git repo with a specific branch */
  async function initGitRepo(branchName: string): Promise<void> {
    const { execa } = await import("execa");
    await execa("git", ["init"], { cwd: tempDir });
    await execa("git", ["config", "user.email", "test@test.com"], { cwd: tempDir });
    await execa("git", ["config", "user.name", "Test"], { cwd: tempDir });
    fs.writeFileSync(path.join(tempDir, "README.md"), "# Test");
    await execa("git", ["add", "."], { cwd: tempDir });
    await execa("git", ["commit", "-m", "Initial commit"], { cwd: tempDir });
    if (branchName !== "main" && branchName !== "master") {
      await execa("git", ["checkout", "-b", branchName], { cwd: tempDir });
    }
  }

  describe("when branches check is disabled", () => {
    it("returns 0 and logs message when not in quiet mode", async () => {
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.branches]
enabled = false`
      );

      const exitCode = await checkBranchCommand({ quiet: false });

      expect(exitCode).toBe(0);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Branch naming check is not enabled in check.toml"
      );
    });

    it("returns 0 silently in quiet mode", async () => {
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.branches]
enabled = false`
      );

      const exitCode = await checkBranchCommand({ quiet: true });

      expect(exitCode).toBe(0);
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });
  });

  describe("when branches check is enabled", () => {
    it("passes for valid branch name", async () => {
      await initGitRepo("feature/v1.0.0/add-feature");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.branches]
enabled = true
pattern = "^(feature|fix|hotfix|docs)/v[0-9]+\\\\.[0-9]+\\\\.[0-9]+/[a-z0-9-]+$"`
      );

      const exitCode = await checkBranchCommand({ quiet: false });

      expect(exitCode).toBe(0);
      expect(mockConsoleWarn).toHaveBeenCalledWith("✓ Branch name is valid");
    });

    it("passes silently in quiet mode", async () => {
      await initGitRepo("feature/v1.0.0/add-feature");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.branches]
enabled = true
pattern = "^feature/.*$"`
      );

      const exitCode = await checkBranchCommand({ quiet: true });

      expect(exitCode).toBe(0);
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it("fails for invalid branch name", async () => {
      await initGitRepo("my-invalid-branch");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.branches]
enabled = true
pattern = "^(feature|fix)/.*$"`
      );

      const exitCode = await checkBranchCommand({ quiet: false });

      expect(exitCode).toBe(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("my-invalid-branch")
      );
    });

    it("passes for excluded branches", async () => {
      await initGitRepo("main");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.branches]
enabled = true
pattern = "^feature/.*$"
exclude = ["main", "master", "develop"]`
      );

      const exitCode = await checkBranchCommand({ quiet: false });

      expect(exitCode).toBe(0);
    });

    it("skips when not in a git repository", async () => {
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.branches]
enabled = true
pattern = "^feature/.*$"`
      );

      const exitCode = await checkBranchCommand({ quiet: false });

      expect(exitCode).toBe(0);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Not in a git repository")
      );
    });

    it("shows examples when branch fails", async () => {
      await initGitRepo("bad-branch");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.branches]
enabled = true
pattern = "^(feature|fix)/v[0-9]+\\\\.[0-9]+\\\\.[0-9]+/.*$"`
      );

      const exitCode = await checkBranchCommand({ quiet: false });

      expect(exitCode).toBe(1);
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Expected pattern:"));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("feature/v1.0.0/add-login"));
    });

    it("does not show examples in quiet mode", async () => {
      await initGitRepo("bad-branch");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.branches]
enabled = true
pattern = "^feature/.*$"`
      );

      const exitCode = await checkBranchCommand({ quiet: true });

      expect(exitCode).toBe(1);
      // Should still show the error
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("bad-branch"));
      // But not the examples
      const calls = mockConsoleError.mock.calls.map((c) => c[0]);
      expect(calls.some((c) => c.includes("Examples:"))).toBe(false);
    });
  });

  describe("with custom config path", () => {
    it("uses specified config file", async () => {
      await initGitRepo("feature/v1.0.0/test");
      const customConfigPath = path.join(tempDir, "custom-check.toml");
      fs.writeFileSync(
        customConfigPath,
        `[process.branches]
enabled = true
pattern = "^feature/.*$"`
      );

      const exitCode = await checkBranchCommand({ config: customConfigPath, quiet: false });

      expect(exitCode).toBe(0);
    });
  });
});

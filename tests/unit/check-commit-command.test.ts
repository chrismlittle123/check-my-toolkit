import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkCommitCommand } from "../../src/process/commands/check-commit.js";

// Mock console methods
const mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

describe("checkCommitCommand", () => {
  let tempDir: string;
  let originalCwd: string;
  let commitMsgFile: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-check-commit-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    commitMsgFile = path.join(tempDir, "COMMIT_EDITMSG");
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("when commit file cannot be read", () => {
    it("returns 1 with error message", async () => {
      fs.writeFileSync(path.join(tempDir, "check.toml"), "");

      const exitCode = await checkCommitCommand("/nonexistent/file", { quiet: false });

      expect(exitCode).toBe(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Could not read commit message file")
      );
    });
  });

  describe("when both checks are disabled", () => {
    it("returns 0 and logs message", async () => {
      fs.writeFileSync(commitMsgFile, "some commit message");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = false

[process.tickets]
enabled = false`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Commit message validation is not enabled in check.toml"
      );
    });

    it("returns 0 silently in quiet mode", async () => {
      fs.writeFileSync(commitMsgFile, "some commit message");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = false`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: true });

      expect(exitCode).toBe(0);
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });
  });

  describe("auto-generated commits", () => {
    it("skips merge commits", async () => {
      fs.writeFileSync(commitMsgFile, "Merge branch 'feature' into main");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat", "fix"]`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining("Skipping auto-generated commit")
      );
    });

    it("skips revert commits", async () => {
      fs.writeFileSync(commitMsgFile, 'Revert "some previous commit"');
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat", "fix"]`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
    });

    it("skips fixup commits", async () => {
      fs.writeFileSync(commitMsgFile, "fixup! original commit message");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat", "fix"]`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
    });

    it("skips squash commits", async () => {
      fs.writeFileSync(commitMsgFile, "squash! original commit message");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat", "fix"]`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
    });

    it("skips amend commits", async () => {
      fs.writeFileSync(commitMsgFile, "amend! original commit message");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat", "fix"]`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
    });
  });

  describe("conventional commits validation", () => {
    it("passes for valid conventional commit", async () => {
      fs.writeFileSync(commitMsgFile, "feat: add new login page");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat", "fix", "docs", "chore"]`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
      expect(mockConsoleWarn).toHaveBeenCalledWith("✓ Commit message is valid");
    });

    it("passes for conventional commit with scope", async () => {
      fs.writeFileSync(commitMsgFile, "fix(auth): resolve token expiry issue");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat", "fix"]`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
    });

    it("passes for conventional commit with breaking change indicator", async () => {
      fs.writeFileSync(commitMsgFile, "feat!: breaking change description");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat", "fix"]`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
    });

    it("fails for invalid conventional commit", async () => {
      fs.writeFileSync(commitMsgFile, "added new feature");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat", "fix", "chore"]`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(1);
      expect(mockConsoleError).toHaveBeenCalledWith("✗ Invalid commit message:");
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("does not match required format")
      );
    });

    it("fails when type is not in allowed list", async () => {
      fs.writeFileSync(commitMsgFile, "wip: work in progress");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat", "fix"]`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(1);
    });

    it("requires scope when configured", async () => {
      fs.writeFileSync(commitMsgFile, "feat: add feature without scope");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat", "fix"]
require_scope = true`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(1);
    });

    it("passes with scope when required", async () => {
      fs.writeFileSync(commitMsgFile, "feat(api): add new endpoint");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat", "fix"]
require_scope = true`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
    });
  });

  describe("custom pattern validation", () => {
    it("passes for message matching custom pattern", async () => {
      fs.writeFileSync(commitMsgFile, "[ABC-123] Fix the bug");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
pattern = "^\\\\[ABC-[0-9]+\\\\] .+$"`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
    });

    it("fails for message not matching custom pattern", async () => {
      fs.writeFileSync(commitMsgFile, "Fix the bug");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
pattern = "^\\\\[ABC-[0-9]+\\\\] .+$"`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(1);
    });
  });

  describe("max subject length validation", () => {
    it("passes when subject is within limit", async () => {
      fs.writeFileSync(commitMsgFile, "feat: short message");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat"]
max_subject_length = 50`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
    });

    it("fails when subject exceeds limit", async () => {
      fs.writeFileSync(
        commitMsgFile,
        "feat: this is a very long commit message that definitely exceeds the configured maximum length"
      );
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat"]
max_subject_length = 50`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("exceeds 50 characters")
      );
    });

    it("only checks first line for subject length", async () => {
      fs.writeFileSync(
        commitMsgFile,
        `feat: short subject

This is a much longer body that can span multiple lines
and contain detailed information about the change.`
      );
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat"]
max_subject_length = 50`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
    });
  });

  describe("ticket reference validation", () => {
    it("passes when commit contains ticket reference", async () => {
      fs.writeFileSync(commitMsgFile, "feat: add login [ABC-123]");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat"]

[process.tickets]
enabled = true
pattern = "ABC-[0-9]+"
require_in_commits = true`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
    });

    it("fails when commit is missing required ticket reference", async () => {
      fs.writeFileSync(commitMsgFile, "feat: add login without ticket");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat"]

[process.tickets]
enabled = true
pattern = "ABC-[0-9]+"
require_in_commits = true`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Missing ticket reference")
      );
    });

    it("does not require ticket when require_in_commits is false", async () => {
      fs.writeFileSync(commitMsgFile, "feat: add login without ticket");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat"]

[process.tickets]
enabled = true
pattern = "ABC-[0-9]+"
require_in_commits = false`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(0);
    });
  });

  describe("combined validations", () => {
    it("reports all violations together", async () => {
      fs.writeFileSync(
        commitMsgFile,
        "added login - this is a very long commit message that exceeds the limit"
      );
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat", "fix"]
max_subject_length = 50

[process.tickets]
enabled = true
pattern = "ABC-[0-9]+"
require_in_commits = true`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: false });

      expect(exitCode).toBe(1);
      // Should report multiple violations
      const errorCalls = mockConsoleError.mock.calls.map((c) => c[0] as string);
      expect(errorCalls.some((c) => c.includes("Missing ticket reference"))).toBe(true);
      expect(errorCalls.some((c) => c.includes("does not match required format"))).toBe(true);
      expect(errorCalls.some((c) => c.includes("exceeds 50 characters"))).toBe(true);
    });
  });

  describe("with custom config path", () => {
    it("uses specified config file", async () => {
      fs.writeFileSync(commitMsgFile, "feat: add feature");
      const customConfigPath = path.join(tempDir, "custom-check.toml");
      fs.writeFileSync(
        customConfigPath,
        `[process.commits]
enabled = true
types = ["feat", "fix"]`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, {
        config: customConfigPath,
        quiet: false,
      });

      expect(exitCode).toBe(0);
    });
  });

  describe("quiet mode", () => {
    it("does not log success message", async () => {
      fs.writeFileSync(commitMsgFile, "feat: add feature");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat"]`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: true });

      expect(exitCode).toBe(0);
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it("still shows errors", async () => {
      fs.writeFileSync(commitMsgFile, "invalid message");
      fs.writeFileSync(
        path.join(tempDir, "check.toml"),
        `[process.commits]
enabled = true
types = ["feat"]`
      );

      const exitCode = await checkCommitCommand(commitMsgFile, { quiet: true });

      expect(exitCode).toBe(1);
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });
});

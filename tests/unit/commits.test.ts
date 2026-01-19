import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CommitsRunner } from "../../src/process/tools/commits.js";

// Mock execa for git operations
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockExeca = vi.mocked(execa);

describe("CommitsRunner", () => {
  let tempDir: string;
  let runner: CommitsRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-commits-test-"));
    runner = new CommitsRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("metadata", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Commits");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("process.commits");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("commits");
    });

    it("has empty configFiles", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("setConfig", () => {
    it("merges config with defaults", () => {
      runner.setConfig({ enabled: true, types: ["feat", "fix"] });
      // Config merging is internal - we verify behavior via run
      expect(runner).toBeDefined();
    });

    it("preserves default require_scope as false", async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: "feat: add new feature",
        stderr: "",
        exitCode: 0,
        failed: false,
        command: "git log -1 --format=%s",
        escapedCommand: "git log -1 --format=%s",
        timedOut: false,
        killed: false,
      } as never);

      runner.setConfig({ enabled: true, types: ["feat", "fix"] });
      const result = await runner.run(tempDir);
      // Should pass because scope is optional by default
      expect(result.passed).toBe(true);
    });
  });

  describe("run", () => {
    describe("config validation", () => {
      it("skips when no pattern or types configured", async () => {
        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("No pattern or types configured");
      });

      it("skips with invalid regex pattern", async () => {
        runner.setConfig({ enabled: true, pattern: "[invalid regex" });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Invalid regex pattern");
      });
    });

    describe("git repository checks", () => {
      it("skips when not in a git repository", async () => {
        mockExeca.mockRejectedValueOnce(new Error("fatal: not a git repository"));

        runner.setConfig({ enabled: true, types: ["feat", "fix"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Not in a git repository");
      });

      it("skips when no commits exist", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat", "fix"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Not in a git repository or no commits");
      });
    });

    describe("conventional commits validation", () => {
      it("passes with valid conventional commit", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "feat: add new feature",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat", "fix", "docs"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("passes with valid commit with optional scope", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "feat(api): add new endpoint",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat", "fix"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when type is not in allowed types", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "chore: update dependencies",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat", "fix"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("does not match required format");
        expect(result.violations[0].rule).toBe("process.commits.pattern");
      });

      it("fails when missing colon separator", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "feat add new feature",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat", "fix"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
      });

      it("handles all standard commit types", async () => {
        const types = [
          "feat",
          "fix",
          "docs",
          "style",
          "refactor",
          "perf",
          "test",
          "build",
          "ci",
          "chore",
          "revert",
        ];

        for (const type of types) {
          vi.clearAllMocks();
          mockExeca.mockResolvedValueOnce({
            stdout: `${type}: some change`,
            stderr: "",
            exitCode: 0,
            failed: false,
            command: "git log -1 --format=%s",
            escapedCommand: "git log -1 --format=%s",
            timedOut: false,
            killed: false,
          } as never);

          runner.setConfig({ enabled: true, types });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        }
      });
    });

    describe("scope validation", () => {
      it("passes without scope when require_scope is false", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "feat: add new feature",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat", "fix"], require_scope: false });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("fails without scope when require_scope is true", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "feat: add new feature",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat", "fix"], require_scope: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("does not match required format");
      });

      it("passes with scope when require_scope is true", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "feat(api): add new endpoint",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat", "fix"], require_scope: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("accepts various scope formats", async () => {
        const scopedCommits = [
          "feat(api): add endpoint",
          "fix(ui/components): fix button",
          "docs(readme): update readme",
          "feat(core-module): add feature",
        ];

        for (const commit of scopedCommits) {
          vi.clearAllMocks();
          mockExeca.mockResolvedValueOnce({
            stdout: commit,
            stderr: "",
            exitCode: 0,
            failed: false,
            command: "git log -1 --format=%s",
            escapedCommand: "git log -1 --format=%s",
            timedOut: false,
            killed: false,
          } as never);

          runner.setConfig({ enabled: true, types: ["feat", "fix", "docs"], require_scope: true });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        }
      });
    });

    describe("max_subject_length validation", () => {
      it("passes when subject is within limit", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "feat: short message",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat"], max_subject_length: 50 });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("fails when subject exceeds limit", async () => {
        const longMessage = "feat: " + "a".repeat(100);
        mockExeca.mockResolvedValueOnce({
          stdout: longMessage,
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat"], max_subject_length: 50 });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.rule === "process.commits.max_subject_length")).toBe(
          true
        );
        expect(result.violations.some((v) => v.message.includes("exceeds max"))).toBe(true);
      });

      it("reports both pattern and length violations", async () => {
        const longMessage = "invalid: " + "a".repeat(100);
        mockExeca.mockResolvedValueOnce({
          stdout: longMessage,
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat", "fix"], max_subject_length: 50 });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
        expect(result.violations.some((v) => v.rule === "process.commits.pattern")).toBe(true);
        expect(result.violations.some((v) => v.rule === "process.commits.max_subject_length")).toBe(
          true
        );
      });

      it("ignores max_subject_length when not set", async () => {
        const longMessage = "feat: " + "a".repeat(200);
        mockExeca.mockResolvedValueOnce({
          stdout: longMessage,
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });
    });

    describe("custom pattern", () => {
      it("uses explicit pattern when provided", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "PROJ-123: fix bug",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, pattern: "^PROJ-\\d+: .+" });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("fails when commit does not match custom pattern", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "fix bug in api",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, pattern: "^PROJ-\\d+: .+" });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
      });

      it("pattern takes precedence over types", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "PROJ-123: fix bug",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        // Both pattern and types provided - pattern should win
        runner.setConfig({ enabled: true, pattern: "^PROJ-\\d+: .+", types: ["feat", "fix"] });
        const result = await runner.run(tempDir);

        // Message matches pattern but not conventional format - should pass
        expect(result.passed).toBe(true);
      });
    });

    describe("non-greedy scope matching (#116)", () => {
      it("correctly handles parentheses in commit description", async () => {
        // Bug #116: greedy regex \(.+\) would match too much
        // e.g., "feat(api): add method (experimental)" should match (api) not (api): add method (experimental)
        mockExeca.mockResolvedValueOnce({
          stdout: "feat(api): add method (experimental)",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat", "fix"], require_scope: true });
        const result = await runner.run(tempDir);

        // Should pass because scope is (api), not greedy match to (experimental)
        expect(result.passed).toBe(true);
      });

      it("handles multiple parentheses groups correctly", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "fix(ui): update button (hover state) for accessibility (WCAG 2.1)",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat", "fix"], require_scope: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("handles whitespace in commit message", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "  feat: add feature  ",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat"] });
        const result = await runner.run(tempDir);

        // trim() is called on the result, so this should pass
        expect(result.passed).toBe(true);
      });

      it("handles empty types array", async () => {
        runner.setConfig({ enabled: true, types: [] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
        expect(result.skipped).toBe(true);
      });

      it("passes valid git call to execa with correct cwd", async () => {
        mockExeca.mockResolvedValueOnce({
          stdout: "feat: test",
          stderr: "",
          exitCode: 0,
          failed: false,
          command: "git log -1 --format=%s",
          escapedCommand: "git log -1 --format=%s",
          timedOut: false,
          killed: false,
        } as never);

        runner.setConfig({ enabled: true, types: ["feat"] });
        await runner.run(tempDir);

        expect(mockExeca).toHaveBeenCalledWith("git", ["log", "-1", "--format=%s"], {
          cwd: tempDir,
        });
      });
    });
  });

  describe("audit", () => {
    it("returns same result as run", async () => {
      mockExeca.mockResolvedValue({
        stdout: "feat: add feature",
        stderr: "",
        exitCode: 0,
        failed: false,
        command: "git log -1 --format=%s",
        escapedCommand: "git log -1 --format=%s",
        timedOut: false,
        killed: false,
      } as never);

      runner.setConfig({ enabled: true, types: ["feat", "fix"] });

      const runResult = await runner.run(tempDir);
      const auditResult = await runner.audit(tempDir);

      expect(auditResult.passed).toBe(runResult.passed);
      expect(auditResult.violations).toEqual(runResult.violations);
    });
  });
});

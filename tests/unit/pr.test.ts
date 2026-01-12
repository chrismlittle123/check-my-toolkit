import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PrRunner } from "../../src/process/tools/pr.js";

describe("PrRunner", () => {
  let tempDir: string;
  let runner: PrRunner;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-pr-test-"));
    runner = new PrRunner();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  /** Helper to create a mock GitHub event payload file */
  function createEventPayload(payload: object): string {
    const eventPath = path.join(tempDir, "event.json");
    fs.writeFileSync(eventPath, JSON.stringify(payload));
    return eventPath;
  }

  describe("metadata", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("PR");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("process.pr");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("pr");
    });

    it("has empty configFiles", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("run", () => {
    describe("no PR context", () => {
      it("skips when GITHUB_EVENT_PATH is not set", async () => {
        delete process.env.GITHUB_EVENT_PATH;
        runner.setConfig({
          enabled: true,
          max_files: 20,
        });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Not in a PR context");
      });

      it("skips when event payload has no PR data", async () => {
        const eventPath = createEventPayload({ action: "push" });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_files: 20,
        });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Not in a PR context");
      });

      it("skips when event file does not exist", async () => {
        process.env.GITHUB_EVENT_PATH = "/nonexistent/path/event.json";
        runner.setConfig({
          enabled: true,
          max_files: 20,
        });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Not in a PR context");
      });

      it("skips when event file contains invalid JSON", async () => {
        const eventPath = path.join(tempDir, "event.json");
        fs.writeFileSync(eventPath, "not valid json");
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_files: 20,
        });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Not in a PR context");
      });
    });

    describe("no limits configured", () => {
      it("skips when no limits are configured", async () => {
        const eventPath = createEventPayload({
          pull_request: { changed_files: 10, additions: 100, deletions: 50 },
        });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
        });

        const result = await runner.run(tempDir);
        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("No PR size limits configured");
      });
    });

    describe("max_files validation", () => {
      it("passes when files changed is within limit", async () => {
        const eventPath = createEventPayload({
          pull_request: { changed_files: 10, additions: 100, deletions: 50 },
        });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_files: 20,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("passes when files changed equals limit", async () => {
        const eventPath = createEventPayload({
          pull_request: { changed_files: 20, additions: 100, deletions: 50 },
        });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_files: 20,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("fails when files changed exceeds limit", async () => {
        const eventPath = createEventPayload({
          pull_request: { changed_files: 25, additions: 100, deletions: 50 },
        });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_files: 20,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("25 files changed");
        expect(result.violations[0].message).toContain("max: 20");
      });
    });

    describe("max_lines validation", () => {
      it("passes when total lines is within limit", async () => {
        const eventPath = createEventPayload({
          pull_request: { changed_files: 5, additions: 200, deletions: 100 },
        });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_lines: 400,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("passes when total lines equals limit", async () => {
        const eventPath = createEventPayload({
          pull_request: { changed_files: 5, additions: 250, deletions: 150 },
        });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_lines: 400,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("fails when total lines exceeds limit", async () => {
        const eventPath = createEventPayload({
          pull_request: { changed_files: 5, additions: 300, deletions: 200 },
        });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_lines: 400,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("500 lines changed");
        expect(result.violations[0].message).toContain("max: 400");
      });

      it("handles missing additions field", async () => {
        const eventPath = createEventPayload({
          pull_request: { changed_files: 5, deletions: 100 },
        });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_lines: 400,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true); // 0 + 100 = 100 < 400
      });

      it("handles missing deletions field", async () => {
        const eventPath = createEventPayload({
          pull_request: { changed_files: 5, additions: 100 },
        });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_lines: 400,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true); // 100 + 0 = 100 < 400
      });
    });

    describe("combined limits", () => {
      it("passes when both files and lines are within limits", async () => {
        const eventPath = createEventPayload({
          pull_request: { changed_files: 10, additions: 150, deletions: 100 },
        });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_files: 20,
          max_lines: 400,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when only files exceed limit", async () => {
        const eventPath = createEventPayload({
          pull_request: { changed_files: 25, additions: 100, deletions: 50 },
        });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_files: 20,
          max_lines: 400,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.pr.max_files");
      });

      it("fails when only lines exceed limit", async () => {
        const eventPath = createEventPayload({
          pull_request: { changed_files: 10, additions: 300, deletions: 200 },
        });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_files: 20,
          max_lines: 400,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.pr.max_lines");
      });

      it("reports both violations when both limits exceeded", async () => {
        const eventPath = createEventPayload({
          pull_request: { changed_files: 25, additions: 300, deletions: 200 },
        });
        process.env.GITHUB_EVENT_PATH = eventPath;
        runner.setConfig({
          enabled: true,
          max_files: 20,
          max_lines: 400,
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
        expect(result.violations.map((v) => v.rule)).toContain("process.pr.max_files");
        expect(result.violations.map((v) => v.rule)).toContain("process.pr.max_lines");
      });
    });
  });

  describe("audit", () => {
    it("returns same result as run", async () => {
      const eventPath = createEventPayload({
        pull_request: { changed_files: 10, additions: 100, deletions: 50 },
      });
      process.env.GITHUB_EVENT_PATH = eventPath;
      runner.setConfig({
        enabled: true,
        max_files: 20,
      });

      const runResult = await runner.run(tempDir);
      const auditResult = await runner.audit(tempDir);

      expect(auditResult.passed).toBe(runResult.passed);
    });
  });

  describe("setConfig", () => {
    it("merges config with defaults", async () => {
      runner.setConfig({ enabled: true, max_files: 15 });

      const eventPath = createEventPayload({
        pull_request: { changed_files: 10 },
      });
      process.env.GITHUB_EVENT_PATH = eventPath;

      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });
  });
});

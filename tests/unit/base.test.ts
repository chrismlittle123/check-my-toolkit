import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BaseToolRunner } from "../../src/code/tools/base.js";
import type { CheckResult, Violation } from "../../src/types/index.js";

// Concrete implementation for testing
class TestToolRunner extends BaseToolRunner {
  readonly name = "TestTool";
  readonly rule = "test.rule";
  readonly toolId = "test";
  readonly configFiles = ["test.config.js", ".testrc"];

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    if (!this.hasConfig(projectRoot)) {
      return this.skipNoConfig(Date.now() - startTime);
    }
    return this.pass(Date.now() - startTime);
  }

  // Expose protected methods for testing
  public testHasConfig(projectRoot: string): boolean {
    return this.hasConfig(projectRoot);
  }

  public testFindConfig(projectRoot: string): string | null {
    return this.findConfig(projectRoot);
  }

  public testIsNotInstalledError(error: unknown): boolean {
    return this.isNotInstalledError(error);
  }

  public testSkipNoConfig(duration: number): CheckResult {
    return this.skipNoConfig(duration);
  }

  public testSkipNotInstalled(duration: number): CheckResult {
    return this.skipNotInstalled(duration);
  }

  public testPass(duration: number): CheckResult {
    return this.pass(duration);
  }

  public testFail(violations: Violation[], duration: number): CheckResult {
    return this.fail(violations, duration);
  }

  public testFromViolations(violations: Violation[], duration: number): CheckResult {
    return this.fromViolations(violations, duration);
  }
}

describe("BaseToolRunner", () => {
  let tempDir: string;
  let runner: TestToolRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-test-"));
    runner = new TestToolRunner();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("hasConfig", () => {
    it("returns true when first config file exists", () => {
      fs.writeFileSync(path.join(tempDir, "test.config.js"), "");
      expect(runner.testHasConfig(tempDir)).toBe(true);
    });

    it("returns true when second config file exists", () => {
      fs.writeFileSync(path.join(tempDir, ".testrc"), "");
      expect(runner.testHasConfig(tempDir)).toBe(true);
    });

    it("returns false when no config file exists", () => {
      expect(runner.testHasConfig(tempDir)).toBe(false);
    });
  });

  describe("findConfig", () => {
    it("finds first config file", () => {
      fs.writeFileSync(path.join(tempDir, "test.config.js"), "");
      expect(runner.testFindConfig(tempDir)).toBe("test.config.js");
    });

    it("finds second config file when first is missing", () => {
      fs.writeFileSync(path.join(tempDir, ".testrc"), "");
      expect(runner.testFindConfig(tempDir)).toBe(".testrc");
    });

    it("returns first matching config when both exist", () => {
      fs.writeFileSync(path.join(tempDir, "test.config.js"), "");
      fs.writeFileSync(path.join(tempDir, ".testrc"), "");
      expect(runner.testFindConfig(tempDir)).toBe("test.config.js");
    });

    it("returns null when no config file exists", () => {
      expect(runner.testFindConfig(tempDir)).toBeNull();
    });
  });

  describe("isNotInstalledError", () => {
    it("returns true for ENOENT errors", () => {
      const error = new Error("spawn npx ENOENT");
      expect(runner.testIsNotInstalledError(error)).toBe(true);
    });

    it("returns true for not found errors", () => {
      const error = new Error("Command not found: eslint");
      expect(runner.testIsNotInstalledError(error)).toBe(true);
    });

    it("returns false for other errors", () => {
      const error = new Error("Some other error");
      expect(runner.testIsNotInstalledError(error)).toBe(false);
    });

    it("returns false for non-Error objects", () => {
      expect(runner.testIsNotInstalledError("string error")).toBe(false);
      expect(runner.testIsNotInstalledError(null)).toBe(false);
      expect(runner.testIsNotInstalledError(undefined)).toBe(false);
      expect(runner.testIsNotInstalledError({ message: "enoent" })).toBe(false);
    });
  });

  describe("skipNoConfig", () => {
    it("creates skip result with correct message", () => {
      const result = runner.testSkipNoConfig(100);

      expect(result.name).toBe("TestTool");
      expect(result.rule).toBe("test.rule");
      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe("test.config.js or .testrc not found");
      expect(result.duration).toBe(100);
      expect(result.violations).toEqual([]);
    });
  });

  describe("skipNotInstalled", () => {
    it("creates skip result with correct message", () => {
      const result = runner.testSkipNotInstalled(50);

      expect(result.name).toBe("TestTool");
      expect(result.rule).toBe("test.rule");
      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe("TestTool not installed");
      expect(result.duration).toBe(50);
    });
  });

  describe("pass", () => {
    it("creates pass result", () => {
      const result = runner.testPass(200);

      expect(result.name).toBe("TestTool");
      expect(result.rule).toBe("test.rule");
      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(false);
      expect(result.violations).toEqual([]);
      expect(result.duration).toBe(200);
    });
  });

  describe("fail", () => {
    it("creates fail result with violations", () => {
      const violations: Violation[] = [
        {
          rule: "test.rule",
          tool: "test",
          message: "Test violation",
          severity: "error",
        },
      ];
      const result = runner.testFail(violations, 150);

      expect(result.name).toBe("TestTool");
      expect(result.rule).toBe("test.rule");
      expect(result.passed).toBe(false);
      expect(result.skipped).toBe(false);
      expect(result.violations).toEqual(violations);
      expect(result.duration).toBe(150);
    });
  });

  describe("fromViolations", () => {
    it("creates pass result when violations array is empty", () => {
      const result = runner.testFromViolations([], 100);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("creates fail result when violations exist", () => {
      const violations: Violation[] = [
        {
          rule: "test.rule",
          tool: "test",
          message: "Error",
          severity: "error",
        },
      ];
      const result = runner.testFromViolations(violations, 100);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(violations);
    });
  });

  describe("run", () => {
    it("skips when no config found", async () => {
      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("not found");
    });

    it("passes when config exists", async () => {
      fs.writeFileSync(path.join(tempDir, "test.config.js"), "");
      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(false);
    });
  });

  describe("audit", () => {
    it("passes audit when config exists", async () => {
      fs.writeFileSync(path.join(tempDir, "test.config.js"), "");
      const result = await runner.audit(tempDir);

      expect(result.name).toBe("TestTool Config");
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("fails audit when config missing", async () => {
      const result = await runner.audit(tempDir);

      expect(result.name).toBe("TestTool Config");
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("config not found");
      expect(result.violations[0].message).toContain("test.config.js");
      expect(result.violations[0].message).toContain(".testrc");
    });

    it("includes correct violation properties", async () => {
      const result = await runner.audit(tempDir);
      const violation = result.violations[0];

      expect(violation.rule).toBe("test.rule.test");
      expect(violation.tool).toBe("audit");
      expect(violation.severity).toBe("error");
    });
  });
});

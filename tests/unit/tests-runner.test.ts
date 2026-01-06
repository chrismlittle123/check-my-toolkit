import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TestsRunner } from "../../src/code/tools/tests.js";

describe("TestsRunner", () => {
  let tempDir: string;
  let runner: TestsRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-tests-runner-test-"));
    runner = new TestsRunner();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Tests");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.tests");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("tests");
    });

    it("has empty config files", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("run with default config", () => {
    it("passes when test files exist", async () => {
      // Create a test file
      fs.writeFileSync(path.join(tempDir, "example.test.ts"), "");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("fails when no test files exist", async () => {
      // Create a non-test file
      fs.writeFileSync(path.join(tempDir, "index.ts"), "");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("No test files found");
      expect(result.violations[0].code).toBe("min-test-files");
    });

    it("finds .spec.ts files", async () => {
      fs.writeFileSync(path.join(tempDir, "example.spec.ts"), "");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });

    it("finds .test.js files", async () => {
      fs.writeFileSync(path.join(tempDir, "example.test.js"), "");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });

    it("finds .test.tsx files", async () => {
      fs.writeFileSync(path.join(tempDir, "example.test.tsx"), "");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });

    it("finds .test.py files", async () => {
      fs.writeFileSync(path.join(tempDir, "example.test.py"), "");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });

    it("finds test files in subdirectories", async () => {
      fs.mkdirSync(path.join(tempDir, "src", "tests"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, "src", "tests", "example.test.ts"), "");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });

    it("ignores node_modules", async () => {
      fs.mkdirSync(path.join(tempDir, "node_modules", "pkg"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, "node_modules", "pkg", "example.test.ts"), "");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("No test files found");
    });
  });

  describe("run with custom config", () => {
    it("uses custom pattern", async () => {
      runner.setConfig({ pattern: "**/*_test.go" });
      fs.writeFileSync(path.join(tempDir, "example_test.go"), "");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });

    it("fails with custom pattern when no matching files", async () => {
      runner.setConfig({ pattern: "**/*_test.go" });
      fs.writeFileSync(path.join(tempDir, "example.test.ts"), "");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("*_test.go");
    });

    it("uses custom min_test_files", async () => {
      runner.setConfig({ min_test_files: 3 });
      fs.writeFileSync(path.join(tempDir, "a.test.ts"), "");
      fs.writeFileSync(path.join(tempDir, "b.test.ts"), "");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Found 2 test file(s)");
      expect(result.violations[0].message).toContain("3 required");
    });

    it("passes with custom min_test_files when enough files exist", async () => {
      runner.setConfig({ min_test_files: 2 });
      fs.writeFileSync(path.join(tempDir, "a.test.ts"), "");
      fs.writeFileSync(path.join(tempDir, "b.test.ts"), "");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });

    it("combines custom pattern and min_test_files", async () => {
      runner.setConfig({ pattern: "**/*.spec.ts", min_test_files: 2 });
      fs.writeFileSync(path.join(tempDir, "a.spec.ts"), "");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Found 1 test file(s)");
    });
  });

  describe("run edge cases", () => {
    it("includes duration in result", async () => {
      fs.writeFileSync(path.join(tempDir, "example.test.ts"), "");

      const result = await runner.run(tempDir);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("has correct rule in violations", async () => {
      const result = await runner.run(tempDir);

      expect(result.violations[0].rule).toBe("code.tests.tests");
      expect(result.violations[0].tool).toBe("tests");
    });

    it("handles many test files", async () => {
      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(path.join(tempDir, `test${i}.test.ts`), "");
      }
      runner.setConfig({ min_test_files: 5 });

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });
  });

  describe("audit", () => {
    it("passes with valid default pattern", async () => {
      const result = await runner.audit(tempDir);

      expect(result.name).toBe("Tests Config");
      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(false);
    });

    it("passes with valid custom pattern", async () => {
      runner.setConfig({ pattern: "**/*.spec.ts" });
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("includes duration in result", async () => {
      const result = await runner.audit(tempDir);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });
  });

  describe("error messages", () => {
    it("shows helpful message when no files found", async () => {
      const result = await runner.run(tempDir);

      expect(result.violations[0].message).toContain("No test files found");
      expect(result.violations[0].message).toContain("Expected at least 1");
    });

    it("shows count and required when some files found but not enough", async () => {
      runner.setConfig({ min_test_files: 5 });
      fs.writeFileSync(path.join(tempDir, "a.test.ts"), "");
      fs.writeFileSync(path.join(tempDir, "b.test.ts"), "");

      const result = await runner.run(tempDir);

      expect(result.violations[0].message).toContain("Found 2 test file(s)");
      expect(result.violations[0].message).toContain("5 required");
    });
  });
});


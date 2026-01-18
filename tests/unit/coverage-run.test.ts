import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CoverageRunRunner } from "../../src/code/tools/coverage-run.js";

// Mock execa to avoid actually running tests
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockExeca = vi.mocked(execa);

describe("CoverageRunRunner", () => {
  let tempDir: string;
  let runner: CoverageRunRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-coverage-run-test-"));
    runner = new CoverageRunRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Coverage Run");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.coverage");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("coverage-run");
    });

    it("has empty config files", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("runner detection", () => {
    it("detects vitest when vitest.config.ts exists", async () => {
      fs.writeFileSync(path.join(tempDir, "vitest.config.ts"), "");

      // Setup mock for successful test run
      mockExeca.mockResolvedValueOnce({
        exitCode: 0,
        stdout: "",
        stderr: "",
      } as never);

      // Create coverage report
      fs.mkdirSync(path.join(tempDir, "coverage"));
      fs.writeFileSync(
        path.join(tempDir, "coverage", "coverage-summary.json"),
        JSON.stringify({
          total: {
            lines: { pct: 85 },
            statements: { pct: 85 },
            branches: { pct: 80 },
            functions: { pct: 90 },
          },
        })
      );

      await runner.run(tempDir);

      expect(mockExeca).toHaveBeenCalledWith(
        "npx",
        ["vitest", "run", "--coverage", "--coverage.reporter=json"],
        expect.any(Object)
      );
    });

    it("detects jest when jest.config.js exists", async () => {
      fs.writeFileSync(path.join(tempDir, "jest.config.js"), "");

      mockExeca.mockResolvedValueOnce({
        exitCode: 0,
        stdout: "",
        stderr: "",
      } as never);

      fs.mkdirSync(path.join(tempDir, "coverage"));
      fs.writeFileSync(
        path.join(tempDir, "coverage", "coverage-summary.json"),
        JSON.stringify({
          total: {
            lines: { pct: 85 },
          },
        })
      );

      await runner.run(tempDir);

      expect(mockExeca).toHaveBeenCalledWith(
        "npx",
        ["jest", "--coverage", "--coverageReporters=json"],
        expect.any(Object)
      );
    });

    it("detects pytest when pytest.ini exists", async () => {
      fs.writeFileSync(path.join(tempDir, "pytest.ini"), "");

      mockExeca.mockResolvedValueOnce({
        exitCode: 0,
        stdout: "",
        stderr: "",
      } as never);

      fs.writeFileSync(
        path.join(tempDir, ".coverage.json"),
        JSON.stringify({
          totals: {
            percent_covered: 85,
          },
        })
      );

      await runner.run(tempDir);

      expect(mockExeca).toHaveBeenCalledWith(
        "pytest",
        ["--cov", "--cov-report=json"],
        expect.any(Object)
      );
    });

    it("fails when no runner can be detected", async () => {
      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("Could not detect test runner");
    });
  });

  describe("custom command", () => {
    it("uses custom command when provided", async () => {
      runner.setConfig({
        enabled: true,
        command: "npm run test:cov",
      });

      mockExeca.mockResolvedValueOnce({
        exitCode: 0,
        stdout: "",
        stderr: "",
      } as never);

      fs.mkdirSync(path.join(tempDir, "coverage"));
      fs.writeFileSync(
        path.join(tempDir, "coverage", "coverage-summary.json"),
        JSON.stringify({
          total: { lines: { pct: 90 } },
        })
      );

      await runner.run(tempDir);

      expect(mockExeca).toHaveBeenCalledWith("npm", ["run", "test:cov"], expect.any(Object));
    });
  });

  describe("coverage threshold", () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(tempDir, "vitest.config.ts"), "");
      mockExeca.mockResolvedValueOnce({
        exitCode: 0,
        stdout: "",
        stderr: "",
      } as never);
    });

    it("passes when coverage meets threshold", async () => {
      runner.setConfig({
        enabled: true,
        min_threshold: 80,
      });

      fs.mkdirSync(path.join(tempDir, "coverage"));
      fs.writeFileSync(
        path.join(tempDir, "coverage", "coverage-summary.json"),
        JSON.stringify({
          total: { lines: { pct: 85 } },
        })
      );

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });

    it("fails when coverage is below threshold", async () => {
      runner.setConfig({
        enabled: true,
        min_threshold: 80,
      });

      fs.mkdirSync(path.join(tempDir, "coverage"));
      fs.writeFileSync(
        path.join(tempDir, "coverage", "coverage-summary.json"),
        JSON.stringify({
          total: { lines: { pct: 70 } },
        })
      );

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("70.0%");
      expect(result.violations[0].message).toContain("below minimum threshold 80%");
    });

    it("uses default threshold of 80 when not configured", async () => {
      fs.mkdirSync(path.join(tempDir, "coverage"));
      fs.writeFileSync(
        path.join(tempDir, "coverage", "coverage-summary.json"),
        JSON.stringify({
          total: { lines: { pct: 75 } },
        })
      );

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("below minimum threshold 80%");
    });
  });

  describe("coverage report parsing", () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(tempDir, "vitest.config.ts"), "");
      mockExeca.mockResolvedValueOnce({
        exitCode: 0,
        stdout: "",
        stderr: "",
      } as never);
    });

    it("parses coverage-summary.json format", async () => {
      runner.setConfig({ enabled: true, min_threshold: 80 });

      fs.mkdirSync(path.join(tempDir, "coverage"));
      fs.writeFileSync(
        path.join(tempDir, "coverage", "coverage-summary.json"),
        JSON.stringify({
          total: {
            lines: { pct: 90 },
            statements: { pct: 88 },
            branches: { pct: 85 },
            functions: { pct: 92 },
          },
        })
      );

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });

    it("parses coverage-final.json format", async () => {
      runner.setConfig({ enabled: true, min_threshold: 50 });

      fs.mkdirSync(path.join(tempDir, "coverage"));
      fs.writeFileSync(
        path.join(tempDir, "coverage", "coverage-final.json"),
        JSON.stringify({
          "/path/to/file.ts": {
            s: { "0": 1, "1": 1, "2": 0 }, // 2/3 = 66%
            f: { "0": 1, "1": 0 }, // 1/2 = 50%
            b: { "0": [1, 0] }, // 1/2 = 50%
          },
        })
      );

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });

    it("parses pytest-cov format", async () => {
      runner.setConfig({ enabled: true, min_threshold: 80 });

      fs.writeFileSync(
        path.join(tempDir, ".coverage.json"),
        JSON.stringify({
          totals: {
            percent_covered: 85,
          },
        })
      );

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });

    it("fails when coverage report cannot be found", async () => {
      runner.setConfig({ enabled: true, min_threshold: 80 });

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Could not find or parse coverage report");
    });
  });

  describe("test execution errors", () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(tempDir, "vitest.config.ts"), "");
    });

    it("fails when test command fails with error exit code", async () => {
      mockExeca.mockResolvedValueOnce({
        exitCode: 2,
        stdout: "",
        stderr: "Configuration error",
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Test command failed");
    });

    it("continues when tests fail (exit code 1) to still check coverage", async () => {
      mockExeca.mockResolvedValueOnce({
        exitCode: 1,
        stdout: "",
        stderr: "Some tests failed",
      } as never);

      fs.mkdirSync(path.join(tempDir, "coverage"));
      fs.writeFileSync(
        path.join(tempDir, "coverage", "coverage-summary.json"),
        JSON.stringify({
          total: { lines: { pct: 90 } },
        })
      );

      const result = await runner.run(tempDir);

      // Should still check coverage even if some tests failed
      expect(result.passed).toBe(true);
    });
  });

  describe("audit", () => {
    it("passes when runner can be detected", async () => {
      fs.writeFileSync(path.join(tempDir, "vitest.config.ts"), "");

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("fails when no runner can be detected", async () => {
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Could not detect test runner");
    });
  });
});

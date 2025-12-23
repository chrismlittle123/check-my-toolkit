import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RuffRunner } from "../../src/code/tools/ruff.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("RuffRunner", () => {
  let tempDir: string;
  let runner: RuffRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-ruff-test-"));
    runner = new RuffRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Ruff");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.linting");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("ruff");
    });

    it("has correct config files", () => {
      expect(runner.configFiles).toContain("ruff.toml");
      expect(runner.configFiles).toContain(".ruff.toml");
    });
  });

  describe("hasConfig override", () => {
    it("returns true when ruff.toml exists", async () => {
      fs.writeFileSync(path.join(tempDir, "ruff.toml"), "");
      // Need python files to not skip early
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);
      // If hasConfig returns true, it proceeds to run ruff (not skipNoConfig)
      expect(result.skipped).toBe(false);
    });

    it("returns true when pyproject.toml has [tool.ruff]", async () => {
      fs.writeFileSync(
        path.join(tempDir, "pyproject.toml"),
        "[tool.ruff]\nline-length = 100"
      );
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });

    it("returns false when pyproject.toml exists without [tool.ruff]", async () => {
      fs.writeFileSync(
        path.join(tempDir, "pyproject.toml"),
        "[project]\nname = 'test'"
      );
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 0,
      } as never);

      // Without ruff config, it still runs (doesn't require config like eslint)
      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });
  });

  describe("run", () => {
    it("skips when no Python files exist", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe("No Python files found");
    });

    it("runs ruff when Python files exist", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "ruff",
        ["check", ".", "--output-format", "json"],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
    });

    it("parses violations from Ruff output", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      const ruffOutput = JSON.stringify([
        {
          code: "F401",
          message: "Unused import",
          filename: path.join(tempDir, "test.py"),
          location: {
            row: 1,
            column: 1,
          },
        },
        {
          code: "E501",
          message: "Line too long",
          filename: path.join(tempDir, "src/main.py"),
          location: {
            row: 50,
            column: 80,
          },
        },
      ]);

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: ruffOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);

      expect(result.violations[0]).toMatchObject({
        rule: "code.linting.ruff",
        tool: "ruff",
        file: "test.py",
        line: 1,
        column: 1,
        message: "Unused import",
        code: "F401",
        severity: "error",
      });
    });

    it("passes with empty output", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("handles parse error with non-zero exit code", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "not json",
        stderr: "Configuration error",
        exitCode: 2,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Ruff error");
      expect(result.violations[0].message).toContain("Configuration error");
    });

    it("handles parse failure with exit code 0 (no stderr)", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "not valid json",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      // When parsing fails but exit code is 0, violations ?? [] returns []
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("handles parse failure with non-zero exit but no stderr", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "not valid json",
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      // When parsing fails, exitCode !== 0, but no stderr, violations ?? [] returns []
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("skips when ruff not installed", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);

      const error = new Error("spawn ruff ENOENT");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("Ruff not installed");
    });

    it("fails with error message for other errors", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);

      const error = new Error("Some unexpected error");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Ruff error");
      expect(result.violations[0].message).toContain("Some unexpected error");
    });

    it("handles non-Error thrown objects", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockRejectedValueOnce("string error");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Unknown error");
    });

    it("handles find command failure gracefully", async () => {
      mockedExeca.mockRejectedValueOnce(new Error("find error"));

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe("No Python files found");
    });
  });

  describe("audit", () => {
    it("passes when ruff.toml exists", async () => {
      fs.writeFileSync(path.join(tempDir, "ruff.toml"), "");
      const result = await runner.audit(tempDir);

      expect(result.name).toBe("Ruff Config");
      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(false);
    });

    it("passes when pyproject.toml has [tool.ruff]", async () => {
      fs.writeFileSync(
        path.join(tempDir, "pyproject.toml"),
        "[tool.ruff]\nline-length = 100"
      );
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("fails when no ruff config exists", async () => {
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("Ruff config not found");
      expect(result.violations[0].message).toContain("ruff.toml");
      expect(result.violations[0].message).toContain("pyproject.toml [tool.ruff]");
    });

    it("includes duration in result", async () => {
      const result = await runner.audit(tempDir);
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });
  });

  describe("hasPyprojectConfig edge cases", () => {
    it("returns false when pyproject.toml read fails", async () => {
      // Create a directory named pyproject.toml to cause read error
      fs.mkdirSync(path.join(tempDir, "pyproject.toml"));

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 0,
      } as never);

      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      // Should not throw, just treat as no config
      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });

    it("returns false in audit when pyproject.toml read fails", async () => {
      // Create a directory named pyproject.toml to cause read error
      fs.mkdirSync(path.join(tempDir, "pyproject.toml"));

      // Audit should fail because hasConfig returns false
      const result = await runner.audit(tempDir);
      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Ruff config not found");
    });
  });
});

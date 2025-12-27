import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RuffFormatRunner } from "../../src/code/tools/ruff-format.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("RuffFormatRunner", () => {
  let tempDir: string;
  let runner: RuffFormatRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-ruff-format-test-"));
    runner = new RuffFormatRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Ruff Format");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.formatting");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("ruff-format");
    });

    it("has correct config files", () => {
      expect(runner.configFiles).toContain("ruff.toml");
      expect(runner.configFiles).toContain(".ruff.toml");
    });
  });

  describe("hasConfig override", () => {
    it("returns true when ruff.toml exists", async () => {
      fs.writeFileSync(path.join(tempDir, "ruff.toml"), "");
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
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

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

    it("runs ruff format --check when Python files exist", async () => {
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

      expect(mockedExeca).toHaveBeenCalledWith(
        "ruff",
        ["format", "--check", "."],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
    });

    it("passes when exit code is 0 (files formatted correctly)", async () => {
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

    it("fails when exit code is 1 (files need formatting)", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "Would reformat: test.py",
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toMatchObject({
        rule: "code.formatting.ruff-format",
        tool: "ruff-format",
        file: "test.py",
        message: "File is not formatted correctly",
        code: "format",
        severity: "warning",
      });
    });

    it("parses multiple files needing formatting", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "Would reformat: src/main.py\nWould reformat: lib/utils.py",
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.violations[0].file).toBe("src/main.py");
      expect(result.violations[1].file).toBe("lib/utils.py");
    });

    it("handles exit code 2 as error", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "Configuration error: invalid setting",
        exitCode: 2,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("Ruff format error");
      expect(result.violations[0].message).toContain("Configuration error");
      expect(result.violations[0].severity).toBe("error");
    });

    it("handles plain file paths without 'Would reformat:' prefix", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].file).toBe("test.py");
    });

    it("creates generic violation when output cannot be parsed", async () => {
      fs.writeFileSync(path.join(tempDir, "test.py"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.py",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "Some unparseable output",
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain(
        "Some files are not formatted correctly"
      );
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
      expect(result.skipReason).toContain("Ruff Format not installed");
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
      expect(result.violations[0].message).toContain("Ruff format error");
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

      expect(result.name).toBe("Ruff Format Config");
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
});

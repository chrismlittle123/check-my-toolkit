import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TyRunner } from "../../src/code/tools/ty.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("TyRunner", () => {
  let tempDir: string;
  let runner: TyRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-ty-test-"));
    runner = new TyRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("ty");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.types");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("ty");
    });

    it("has correct config files", () => {
      expect(runner.configFiles).toContain("ty.toml");
      expect(runner.configFiles).toContain("pyproject.toml");
    });
  });

  describe("run", () => {
    it("passes when no type errors", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "All checks passed!",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "uvx",
        ["ty", "check", "--output-format", "concise", "."],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
    });

    it("parses type errors from ty output", async () => {
      const tyOutput = `src/main.py:4:15: error[invalid-assignment] Object of type \`int\` is not assignable to \`str\`
src/utils.py:10:1: error[unresolved-import] Cannot resolve import \`foo\`
Found 2 diagnostics`;

      mockedExeca.mockResolvedValueOnce({
        stdout: tyOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);

      expect(result.violations[0]).toMatchObject({
        rule: "code.types.ty",
        tool: "ty",
        file: "src/main.py",
        line: 4,
        column: 15,
        message: "Object of type `int` is not assignable to `str`",
        code: "invalid-assignment",
        severity: "error",
      });

      expect(result.violations[1]).toMatchObject({
        file: "src/utils.py",
        line: 10,
        column: 1,
        code: "unresolved-import",
      });
    });

    it("handles warning severity", async () => {
      const tyOutput = `src/main.py:5:1: warning[unused-import] Import \`os\` is unused
Found 1 diagnostic`;

      mockedExeca.mockResolvedValueOnce({
        stdout: tyOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe("warning");
    });

    it("handles configuration error (exit code 2)", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "Invalid configuration in ty.toml",
        exitCode: 2,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("ty configuration error");
      expect(result.violations[0].message).toContain("Invalid configuration");
    });

    it("handles configuration error with stdout", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "Error reading config file",
        stderr: "",
        exitCode: 2,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Error reading config file");
    });

    it("handles ty failure with no parseable errors", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "Some general error message",
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("ty error");
      expect(result.violations[0].message).toContain("Some general error message");
    });

    it("handles ty failure with stderr only", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "Python environment error",
        exitCode: 101,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Python environment error");
    });

    it("truncates long error messages", async () => {
      const longError = "A".repeat(1000);
      mockedExeca.mockResolvedValueOnce({
        stdout: longError,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0].message.length).toBeLessThanOrEqual(520);
    });

    it("skips when ty not installed", async () => {
      const error = new Error("spawn uvx ENOENT");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("ty not installed");
    });

    it("fails with error message for other errors", async () => {
      const error = new Error("Some unexpected error");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("ty error");
      expect(result.violations[0].message).toContain("Some unexpected error");
    });

    it("handles non-Error thrown objects", async () => {
      mockedExeca.mockRejectedValueOnce("string error");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Unknown error");
    });

    it("includes duration in result", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "All checks passed!",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });

    it("handles undefined stdout/stderr", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: undefined,
        stderr: undefined,
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      // Should not throw and should handle gracefully with a fallback message
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("Type check failed");
    });

    it("handles lines that do not match diagnostic pattern", async () => {
      const tyOutput = `
Some info message
Another info line
src/main.py:10:5: error[type-error] Actual error.
More info
Found 1 diagnostic
`;

      mockedExeca.mockResolvedValueOnce({
        stdout: tyOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].code).toBe("type-error");
    });

    it("handles multiple errors in different files", async () => {
      const tyOutput = `lib/core.py:1:1: error[syntax-error] Invalid syntax
tests/test_main.py:15:10: error[type-error] Expected int, got str
src/api/handler.py:100:25: warning[deprecated] Function is deprecated
Found 3 diagnostics`;

      mockedExeca.mockResolvedValueOnce({
        stdout: tyOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations).toHaveLength(3);
      expect(result.violations[0].file).toBe("lib/core.py");
      expect(result.violations[1].file).toBe("tests/test_main.py");
      expect(result.violations[2].file).toBe("src/api/handler.py");
      expect(result.violations[2].severity).toBe("warning");
    });

    it("handles internal error exit code 101", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "Internal error: panic in type checker",
        exitCode: 101,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("ty error");
    });
  });

  describe("audit", () => {
    it("passes when ty.toml exists", async () => {
      fs.writeFileSync(path.join(tempDir, "ty.toml"), "");
      const result = await runner.audit(tempDir);

      expect(result.name).toBe("ty Config");
      expect(result.passed).toBe(true);
    });

    it("passes when pyproject.toml exists", async () => {
      fs.writeFileSync(path.join(tempDir, "pyproject.toml"), "[tool.ty]");
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("fails when no config exists", async () => {
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("ty config not found");
    });
  });
});

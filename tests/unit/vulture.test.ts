import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VultureRunner } from "../../src/code/tools/vulture.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("VultureRunner", () => {
  let tempDir: string;
  let runner: VultureRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-vulture-test-"));
    runner = new VultureRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Vulture");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.unused");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("vulture");
    });

    it("has empty config files (vulture uses CLI args)", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("run", () => {
    it("skips when no Python files found", async () => {
      // Mock find returning empty (no Python files)
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe("No Python files found");
      expect(result.passed).toBe(true);
    });

    it("runs vulture and passes when no dead code found", async () => {
      // Mock find returning Python files
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      // Mock vulture returning no output (clean)
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenNthCalledWith(
        2,
        "vulture",
        ["."],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("detects unused function", async () => {
      // Mock find returning Python files
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      // Mock vulture output (exit code 3 = dead code found in vulture 2.9+)
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py:10: unused function 'my_unused_func' (60% confidence)",
        stderr: "",
        exitCode: 3,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toMatchObject({
        rule: "code.unused.vulture",
        tool: "vulture",
        file: "main.py",
        line: 10,
        message: "unused function 'my_unused_func' (60% confidence)",
        code: "unused-function",
        severity: "warning",
      });
    });

    it("detects unused class", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "app.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      mockedExeca.mockResolvedValueOnce({
        stdout: "app.py:25: unused class 'OldHandler' (80% confidence)",
        stderr: "",
        exitCode: 3,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0]).toMatchObject({
        file: "app.py",
        line: 25,
        code: "unused-class",
        message: "unused class 'OldHandler' (80% confidence)",
      });
    });

    it("detects unused variable", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "utils.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      mockedExeca.mockResolvedValueOnce({
        stdout: "utils.py:5: unused variable 'temp' (90% confidence)",
        stderr: "",
        exitCode: 3,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0]).toMatchObject({
        code: "unused-variable",
      });
    });

    it("detects unused import", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py:1: unused import 'os' (100% confidence)",
        stderr: "",
        exitCode: 3,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0]).toMatchObject({
        code: "unused-import",
      });
    });

    it("detects unused method", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "models.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      mockedExeca.mockResolvedValueOnce({
        stdout: "models.py:42: unused method 'get_data' (75% confidence)",
        stderr: "",
        exitCode: 3,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0]).toMatchObject({
        code: "unused-method",
      });
    });

    it("detects unused attribute", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "config.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      mockedExeca.mockResolvedValueOnce({
        stdout: "config.py:15: unused attribute 'debug_mode' (70% confidence)",
        stderr: "",
        exitCode: 3,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0]).toMatchObject({
        code: "unused-attribute",
      });
    });

    it("detects unreachable code", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py:50: unreachable code after 'return' (100% confidence)",
        stderr: "",
        exitCode: 3,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0]).toMatchObject({
        code: "unreachable-code",
      });
    });

    it("handles multiple violations", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      mockedExeca.mockResolvedValueOnce({
        stdout: `main.py:5: unused import 'sys' (100% confidence)
main.py:10: unused function 'helper' (80% confidence)
utils.py:20: unused variable 'x' (60% confidence)`,
        stderr: "",
        exitCode: 3,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(3);
      expect(result.violations[0].file).toBe("main.py");
      expect(result.violations[0].line).toBe(5);
      expect(result.violations[1].file).toBe("main.py");
      expect(result.violations[1].line).toBe(10);
      expect(result.violations[2].file).toBe("utils.py");
      expect(result.violations[2].line).toBe(20);
    });

    it("handles vulture error (exit code 1 or 2)", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "vulture: error: invalid option",
        exitCode: 2,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Vulture error");
    });

    it("skips when vulture not installed", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      const error = new Error("spawn vulture ENOENT");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("Vulture not installed");
    });

    it("fails with error message for other errors", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      const error = new Error("Some unexpected error");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Vulture error");
      expect(result.violations[0].message).toContain("Some unexpected error");
    });

    it("handles non-Error thrown objects", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      mockedExeca.mockRejectedValueOnce("string error");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Unknown error");
    });

    it("includes duration in result", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });

    it("ignores malformed lines", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      mockedExeca.mockResolvedValueOnce({
        stdout: `this is not a valid line
main.py:10: unused function 'valid' (80% confidence)
another invalid line`,
        stderr: "",
        exitCode: 3,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].line).toBe(10);
    });

    it("handles unknown code type gracefully", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py:10: unused something_new 'x' (80% confidence)",
        stderr: "",
        exitCode: 3,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0].code).toBe("unused-code");
    });
  });

  describe("audit", () => {
    it("skips when no Python files found", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.audit(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe("No Python files found");
    });

    it("passes when pyproject.toml exists", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      fs.writeFileSync(path.join(tempDir, "pyproject.toml"), "[project]");
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("passes when setup.py exists", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      fs.writeFileSync(path.join(tempDir, "setup.py"), "from setuptools import setup");
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("passes when requirements.txt exists", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      fs.writeFileSync(path.join(tempDir, "requirements.txt"), "flask==2.0.0");
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("fails when no Python project file found", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("No Python project file found");
      expect(result.violations[0].severity).toBe("warning");
    });

    it("includes duration in audit result", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "main.py\n",
        stderr: "",
        exitCode: 0,
      } as never);

      fs.writeFileSync(path.join(tempDir, "pyproject.toml"), "[project]");
      const result = await runner.audit(tempDir);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });
  });
});

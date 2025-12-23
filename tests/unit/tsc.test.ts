import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TscRunner } from "../../src/code/tools/tsc.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("TscRunner", () => {
  let tempDir: string;
  let runner: TscRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-tsc-test-"));
    runner = new TscRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("TypeScript");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.types");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("tsc");
    });

    it("has correct config files", () => {
      expect(runner.configFiles).toContain("tsconfig.json");
    });
  });

  describe("run", () => {
    it("skips when no tsconfig.json exists", async () => {
      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("No TypeScript config found");
      expect(mockedExeca).not.toHaveBeenCalled();
    });

    it("runs tsc when config exists", async () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "npx",
        ["tsc", "--noEmit"],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
    });

    it("parses type errors from tsc output", async () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");

      const tscOutput = `${path.join(tempDir, "src/index.ts")}(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
${path.join(tempDir, "src/utils.ts")}(25,10): error TS7006: Parameter 'x' implicitly has an 'any' type.`;

      mockedExeca.mockResolvedValueOnce({
        stdout: tscOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);

      expect(result.violations[0]).toMatchObject({
        rule: "code.types.tsc",
        tool: "tsc",
        file: "src/index.ts",
        line: 10,
        column: 5,
        message: "Type 'string' is not assignable to type 'number'.",
        code: "TS2322",
        severity: "error",
      });

      expect(result.violations[1]).toMatchObject({
        file: "src/utils.ts",
        line: 25,
        column: 10,
        code: "TS7006",
      });
    });

    it("handles tsc failure with no parseable errors", async () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");

      mockedExeca.mockResolvedValueOnce({
        stdout: "Some general error message",
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("TypeScript error");
      expect(result.violations[0].message).toContain("Some general error message");
    });

    it("handles tsc failure with stderr only", async () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");

      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "Cannot find tsconfig",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Cannot find tsconfig");
    });

    it("truncates long error messages", async () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");

      const longError = "A".repeat(1000);
      mockedExeca.mockResolvedValueOnce({
        stdout: longError,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0].message.length).toBeLessThanOrEqual(520);
    });

    it("returns pass with parsed violations when they exist", async () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");

      const tscOutput = `${path.join(tempDir, "src/index.ts")}(1,1): error TS2322: Type error.`;

      mockedExeca.mockResolvedValueOnce({
        stdout: tscOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    it("skips when tsc not installed", async () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");
      const error = new Error("spawn npx ENOENT");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("TypeScript not installed");
    });

    it("fails with error message for other errors", async () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");
      const error = new Error("Some unexpected error");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("TypeScript error");
      expect(result.violations[0].message).toContain("Some unexpected error");
    });

    it("handles non-Error thrown objects", async () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");
      mockedExeca.mockRejectedValueOnce("string error");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Unknown error");
    });

    it("includes duration in result", async () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });

    it("handles undefined stdout/stderr", async () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");
      mockedExeca.mockResolvedValueOnce({
        stdout: undefined,
        stderr: undefined,
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      // Should not throw and should handle gracefully
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("handles lines that do not match error pattern", async () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");

      const tscOutput = `
Some info message
Another info line
${path.join(tempDir, "src/index.ts")}(10,5): error TS2322: Actual error.
More info
`;

      mockedExeca.mockResolvedValueOnce({
        stdout: tscOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].code).toBe("TS2322");
    });
  });

  describe("audit", () => {
    it("passes when tsconfig.json exists", async () => {
      fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");
      const result = await runner.audit(tempDir);

      expect(result.name).toBe("TypeScript Config");
      expect(result.passed).toBe(true);
    });

    it("fails when tsconfig.json missing", async () => {
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("TypeScript config not found");
    });
  });
});

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ESLintRunner } from "../../src/code/tools/eslint.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("ESLintRunner", () => {
  let tempDir: string;
  let runner: ESLintRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-eslint-test-"));
    runner = new ESLintRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("ESLint");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.linting");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("eslint");
    });

    it("has correct config files", () => {
      expect(runner.configFiles).toContain("eslint.config.js");
      expect(runner.configFiles).toContain("eslint.config.mjs");
      expect(runner.configFiles).toContain("eslint.config.cjs");
      expect(runner.configFiles).toContain(".eslintrc.js");
      expect(runner.configFiles).toContain(".eslintrc.json");
      expect(runner.configFiles).toContain(".eslintrc.yml");
      expect(runner.configFiles).toContain(".eslintrc.yaml");
    });
  });

  describe("run", () => {
    it("skips when no config file exists", async () => {
      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("No ESLint config found");
      expect(mockedExeca).not.toHaveBeenCalled();
    });

    it("runs eslint when config exists", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "npx",
        ["eslint", ".", "--format", "json"],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
    });

    it("parses violations from ESLint output", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      const eslintOutput = JSON.stringify([
        {
          filePath: path.join(tempDir, "src/index.ts"),
          messages: [
            {
              ruleId: "no-unused-vars",
              severity: 2,
              message: "Unused variable",
              line: 10,
              column: 5,
            },
            {
              ruleId: "semi",
              severity: 1,
              message: "Missing semicolon",
              line: 15,
              column: 20,
            },
          ],
        },
      ]);

      mockedExeca.mockResolvedValueOnce({
        stdout: eslintOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);

      expect(result.violations[0]).toMatchObject({
        rule: "code.linting.eslint",
        tool: "eslint",
        file: "src/index.ts",
        line: 10,
        column: 5,
        message: "Unused variable",
        code: "no-unused-vars",
        severity: "error",
      });

      expect(result.violations[1]).toMatchObject({
        severity: "warning",
        code: "semi",
      });
    });

    it("handles null ruleId in ESLint output", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      const eslintOutput = JSON.stringify([
        {
          filePath: path.join(tempDir, "src/index.ts"),
          messages: [
            {
              ruleId: null,
              severity: 2,
              message: "Parsing error",
              line: 1,
              column: 1,
            },
          ],
        },
      ]);

      mockedExeca.mockResolvedValueOnce({
        stdout: eslintOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0].code).toBeUndefined();
    });

    it("handles parse error with non-zero exit code", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      mockedExeca.mockResolvedValueOnce({
        stdout: "not json",
        stderr: "Configuration error",
        exitCode: 2,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("ESLint error");
      expect(result.violations[0].message).toContain("Configuration error");
    });

    it("passes with empty violations on parse failure with exit 0", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      mockedExeca.mockResolvedValueOnce({
        stdout: "not json",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("skips when eslint not installed", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      const error = new Error("spawn npx ENOENT");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("ESLint not installed");
    });

    it("fails with error message for other errors", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      const error = new Error("Some unexpected error");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("ESLint error");
      expect(result.violations[0].message).toContain("Some unexpected error");
    });

    it("handles non-Error thrown objects", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      mockedExeca.mockRejectedValueOnce("string error");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Unknown error");
    });

    it("includes duration in result", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });
  });

  describe("audit", () => {
    it("passes when config exists", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      const result = await runner.audit(tempDir);

      expect(result.name).toBe("ESLint Config");
      expect(result.passed).toBe(true);
    });

    it("fails when config missing", async () => {
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("ESLint config not found");
    });
  });
});

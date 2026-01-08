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
    it("fails when no config file exists", async () => {
      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("Config not found");
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
    it("passes when config exists and no rules required", async () => {
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

    it("passes when required rules match effective config", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      fs.mkdirSync(path.join(tempDir, "src"));
      fs.writeFileSync(path.join(tempDir, "src/index.ts"), "");

      runner.setConfig({
        files: ["src/**/*.ts"],
        rules: {
          "no-unused-vars": "error",
          semi: "warn",
        },
      });

      const printConfigOutput = JSON.stringify({
        rules: {
          "no-unused-vars": [2],
          semi: [1, "always"],
        },
      });

      mockedExeca.mockResolvedValueOnce({
        stdout: printConfigOutput,
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.audit(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "npx",
        ["eslint", "--print-config", "src/index.ts"],
        expect.objectContaining({ cwd: tempDir })
      );
      expect(result.passed).toBe(true);
    });

    it("fails when required rule is missing from effective config", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      fs.mkdirSync(path.join(tempDir, "src"));
      fs.writeFileSync(path.join(tempDir, "src/index.ts"), "");

      runner.setConfig({
        files: ["src/**/*.ts"],
        rules: {
          "no-unused-vars": "error",
        },
      });

      const printConfigOutput = JSON.stringify({
        rules: {}, // Rule not present
      });

      mockedExeca.mockResolvedValueOnce({
        stdout: printConfigOutput,
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("no-unused-vars");
      expect(result.violations[0].message).toContain("required but not configured");
    });

    it("fails when required rule has wrong severity", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      fs.mkdirSync(path.join(tempDir, "src"));
      fs.writeFileSync(path.join(tempDir, "src/index.ts"), "");

      runner.setConfig({
        files: ["src/**/*.ts"],
        rules: {
          "no-unused-vars": "error", // Require error (2)
        },
      });

      const printConfigOutput = JSON.stringify({
        rules: {
          "no-unused-vars": [1], // Actual is warn (1)
        },
      });

      mockedExeca.mockResolvedValueOnce({
        stdout: printConfigOutput,
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("no-unused-vars");
      expect(result.violations[0].message).toContain('expected "error"');
      expect(result.violations[0].message).toContain('got "warn"');
    });

    it("handles eslint --print-config failure", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      fs.mkdirSync(path.join(tempDir, "src"));
      fs.writeFileSync(path.join(tempDir, "src/index.ts"), "");

      runner.setConfig({
        files: ["src/**/*.ts"],
        rules: {
          "no-unused-vars": "error",
        },
      });

      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "Error parsing config",
        exitCode: 1,
      } as never);

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Failed to read ESLint config");
    });

    it("fails when files config is missing but rules are defined", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");

      runner.setConfig({
        rules: {
          "no-unused-vars": "error",
        },
      });

      const result = await runner.audit(tempDir);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe("error");
      expect(result.violations[0].message).toContain('requires "files" to be configured');
    });

    it("fails when no files match the configured pattern", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      // No source files created, but files pattern is configured

      runner.setConfig({
        files: ["src/**/*.ts"],
        rules: {
          "no-unused-vars": "error",
        },
      });

      const result = await runner.audit(tempDir);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe("error");
      expect(result.violations[0].message).toContain("No files found matching patterns");
    });

    it("normalizes rule severity from array format", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      fs.mkdirSync(path.join(tempDir, "src"));
      fs.writeFileSync(path.join(tempDir, "src/index.ts"), "");

      runner.setConfig({
        files: ["src/**/*.ts"],
        rules: {
          semi: ["error", "always"], // Array format with options
        },
      });

      const printConfigOutput = JSON.stringify({
        rules: {
          semi: [2, "always"],
        },
      });

      mockedExeca.mockResolvedValueOnce({
        stdout: printConfigOutput,
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("supports 'off' severity", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      fs.mkdirSync(path.join(tempDir, "src"));
      fs.writeFileSync(path.join(tempDir, "src/index.ts"), "");

      runner.setConfig({
        files: ["src/**/*.ts"],
        rules: {
          "no-console": "off",
        },
      });

      const printConfigOutput = JSON.stringify({
        rules: {
          "no-console": [0],
        },
      });

      mockedExeca.mockResolvedValueOnce({
        stdout: printConfigOutput,
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });
  });

  describe("setConfig", () => {
    it("passes files option to eslint", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      runner.setConfig({ files: ["src/**/*.ts", "lib/**/*.ts"] });

      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 0,
      } as never);

      await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "npx",
        ["eslint", "src/**/*.ts", "lib/**/*.ts", "--format", "json"],
        expect.any(Object)
      );
    });

    it("passes ignore patterns to eslint", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      runner.setConfig({ ignore: ["dist/**", "node_modules/**"] });

      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 0,
      } as never);

      await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "npx",
        ["eslint", ".", "--format", "json", "--ignore-pattern", "dist/**", "--ignore-pattern", "node_modules/**"],
        expect.any(Object)
      );
    });

    it("passes max-warnings option to eslint", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      runner.setConfig({ "max-warnings": 10 });

      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 0,
      } as never);

      await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "npx",
        ["eslint", ".", "--format", "json", "--max-warnings", "10"],
        expect.any(Object)
      );
    });

    it("combines all config options", async () => {
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      runner.setConfig({
        files: ["src/**/*.ts"],
        ignore: ["**/*.test.ts"],
        "max-warnings": 5,
      });

      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 0,
      } as never);

      await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "npx",
        ["eslint", "src/**/*.ts", "--format", "json", "--ignore-pattern", "**/*.test.ts", "--max-warnings", "5"],
        expect.any(Object)
      );
    });
  });
});

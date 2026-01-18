import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PrettierRunner } from "../../src/code/tools/prettier.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("PrettierRunner", () => {
  let tempDir: string;
  let runner: PrettierRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-prettier-test-"));
    runner = new PrettierRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Prettier");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.formatting");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("prettier");
    });

    it("has correct config files", () => {
      expect(runner.configFiles).toContain(".prettierrc");
      expect(runner.configFiles).toContain(".prettierrc.json");
      expect(runner.configFiles).toContain("prettier.config.js");
    });
  });

  describe("hasConfig override", () => {
    it("returns true when .prettierrc exists", async () => {
      fs.writeFileSync(path.join(tempDir, ".prettierrc"), "{}");
      fs.writeFileSync(path.join(tempDir, "test.ts"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.ts",
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

    it("returns true when package.json has prettier key", async () => {
      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify({ prettier: { semi: false } })
      );
      fs.writeFileSync(path.join(tempDir, "test.ts"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.ts",
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

    it("returns false when package.json exists without prettier key", async () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify({ name: "test" }));
      fs.writeFileSync(path.join(tempDir, "test.ts"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.ts",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      // Without prettier config, it still runs
      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });
  });

  describe("run", () => {
    it("skips when no formattable files exist", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe("No formattable files found");
    });

    it("runs prettier --check when formattable files exist", async () => {
      fs.writeFileSync(path.join(tempDir, "test.ts"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.ts",
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
        "npx",
        ["prettier", "--check", "."],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
    });

    it("passes when exit code is 0 (files formatted correctly)", async () => {
      fs.writeFileSync(path.join(tempDir, "test.ts"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.ts",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "Checking formatting...\nAll matched files use Prettier code style!",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("fails when exit code is 1 (files need formatting)", async () => {
      fs.writeFileSync(path.join(tempDir, "test.ts"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.ts",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "Checking formatting...\n[warn] test.ts\n[warn] Code style issues found.",
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toMatchObject({
        rule: "code.formatting.prettier",
        tool: "prettier",
        file: "test.ts",
        message: "File is not formatted correctly",
        code: "format",
        severity: "warning",
      });
    });

    it("parses multiple files needing formatting", async () => {
      fs.writeFileSync(path.join(tempDir, "test.ts"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.ts",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout:
          "Checking formatting...\n[warn] src/main.ts\n[warn] lib/utils.js\n[warn] Code style issues found.",
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.violations[0].file).toBe("src/main.ts");
      expect(result.violations[1].file).toBe("lib/utils.js");
    });

    it("handles exit code 2 as error", async () => {
      fs.writeFileSync(path.join(tempDir, "test.ts"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.ts",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "Invalid configuration file",
        exitCode: 2,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("Prettier error");
      expect(result.violations[0].message).toContain("Invalid configuration");
      expect(result.violations[0].severity).toBe("error");
    });

    it("creates generic violation when output cannot be parsed", async () => {
      fs.writeFileSync(path.join(tempDir, "test.ts"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.ts",
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
      expect(result.violations[0].message).toContain("Some files are not formatted correctly");
    });

    it("skips when prettier not installed", async () => {
      fs.writeFileSync(path.join(tempDir, "test.ts"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.ts",
        stderr: "",
        exitCode: 0,
      } as never);

      const error = new Error("spawn npx ENOENT");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("Prettier not installed");
    });

    it("fails with error message for other errors", async () => {
      fs.writeFileSync(path.join(tempDir, "test.ts"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.ts",
        stderr: "",
        exitCode: 0,
      } as never);

      const error = new Error("Some unexpected error");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Prettier error");
      expect(result.violations[0].message).toContain("Some unexpected error");
    });

    it("handles non-Error thrown objects", async () => {
      fs.writeFileSync(path.join(tempDir, "test.ts"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.ts",
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
      expect(result.skipReason).toBe("No formattable files found");
    });
  });

  describe("audit", () => {
    it("passes when .prettierrc exists", async () => {
      fs.writeFileSync(path.join(tempDir, ".prettierrc"), "{}");
      const result = await runner.audit(tempDir);

      expect(result.name).toBe("Prettier Config");
      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(false);
    });

    it("passes when prettier.config.js exists", async () => {
      fs.writeFileSync(path.join(tempDir, "prettier.config.js"), "module.exports = {};");
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("passes when package.json has prettier key", async () => {
      fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify({ prettier: { semi: false } })
      );
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("fails when no prettier config exists", async () => {
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("Prettier config not found");
      expect(result.violations[0].message).toContain(".prettierrc");
      expect(result.violations[0].message).toContain('package.json "prettier" key');
    });

    it("includes duration in result", async () => {
      const result = await runner.audit(tempDir);
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });
  });

  describe("hasPackageJsonConfig edge cases", () => {
    it("returns false when package.json is invalid JSON", async () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), "not json");

      mockedExeca.mockResolvedValueOnce({
        stdout: "test.ts",
        stderr: "",
        exitCode: 0,
      } as never);
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      fs.writeFileSync(path.join(tempDir, "test.ts"), "");

      // Should not throw, just treat as no config
      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });

    it("returns false in audit when package.json is invalid JSON", async () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), "not json");

      // Audit should fail because hasConfig returns false
      const result = await runner.audit(tempDir);
      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Prettier config not found");
    });
  });
});

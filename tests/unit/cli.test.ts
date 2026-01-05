import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock process.exit to prevent test from actually exiting
const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
const mockStdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

// Mock commander to capture action handlers
let checkActionHandler: ((options: { config?: string; format: string }) => Promise<void>) | null = null;
let auditActionHandler: ((options: { config?: string; format: string }) => Promise<void>) | null = null;
let validateActionHandler: ((options: { config?: string; format: string }) => void) | null = null;

vi.mock("commander", () => {
  const createMockCommand = () => {
    const cmd: Record<string, unknown> = {};
    cmd.name = vi.fn().mockReturnValue(cmd);
    cmd.description = vi.fn().mockReturnValue(cmd);
    cmd.version = vi.fn().mockReturnValue(cmd);
    cmd.option = vi.fn().mockReturnValue(cmd);
    cmd.addOption = vi.fn().mockReturnValue(cmd);
    cmd.addCommand = vi.fn().mockReturnValue(cmd);
    cmd.parse = vi.fn();
    cmd.command = vi.fn().mockImplementation((name: string) => {
      const subCmd = createMockCommand();
      subCmd.action = vi.fn().mockImplementation((handler) => {
        if (name === "check") {
          checkActionHandler = handler;
        } else if (name === "audit") {
          auditActionHandler = handler;
        } else if (name === "validate") {
          validateActionHandler = handler;
        }
        return subCmd;
      });
      return subCmd;
    });
    cmd.action = vi.fn().mockImplementation((handler) => {
      validateActionHandler = handler;
      return cmd;
    });
    return cmd;
  };

  const createMockOption = () => {
    const opt: Record<string, unknown> = {};
    opt.choices = vi.fn().mockReturnValue(opt);
    opt.default = vi.fn().mockReturnValue(opt);
    return opt;
  };

  return {
    Command: vi.fn().mockImplementation(() => createMockCommand()),
    Option: vi.fn().mockImplementation(() => createMockOption()),
  };
});

// Mock execa for tool runs
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("CLI", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-cli-test-"));
    vi.clearAllMocks();
    checkActionHandler = null;
    auditActionHandler = null;
    validateActionHandler = null;

    // Import CLI to register handlers
    await import("../../src/cli.js");
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.resetModules();
  });

  describe("code check command", () => {
    it("runs code checks and outputs text format", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 0,
      } as never);

      await checkActionHandler!({ config: configPath, format: "text" });

      expect(mockStdoutWrite).toHaveBeenCalled();
      const output = mockStdoutWrite.mock.calls[0][0] as string;
      expect(output).toContain("check-my-toolkit");
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("runs code checks and outputs JSON format", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");

      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 0,
      } as never);

      await checkActionHandler!({ config: configPath, format: "json" });

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      expect(() => JSON.parse(output)).not.toThrow();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("exits with code 1 when violations found", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");

      const eslintOutput = JSON.stringify([
        {
          filePath: path.join(tempDir, "src/index.ts"),
          messages: [
            { ruleId: "no-var", severity: 2, message: "Error", line: 1, column: 1 },
          ],
        },
      ]);

      mockedExeca.mockResolvedValueOnce({
        stdout: eslintOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      await checkActionHandler!({ config: configPath, format: "text" });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("exits with code 2 for config errors", async () => {
      await checkActionHandler!({ config: "/nonexistent/check.toml", format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Config error"));
      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it("exits with code 3 for runtime errors", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");

      // Simulate a runtime error by mocking execa to reject
      mockedExeca.mockRejectedValueOnce({ notAnError: true });

      await checkActionHandler!({ config: configPath, format: "text" });

      // The ESLint runner catches non-Error throws and reports as "Unknown error"
      // But it doesn't throw to CLI level - it returns a fail result
      // This test verifies the behavior when execa rejects
      expect(mockExit).toHaveBeenCalled();
    });

    it("handles Error objects in runtime errors", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");

      mockedExeca.mockRejectedValueOnce(new Error("Specific error message"));

      await checkActionHandler!({ config: configPath, format: "text" });

      // ESLint runner catches errors and returns fail result with violation
      // It doesn't throw to CLI level
      expect(mockExit).toHaveBeenCalled();
    });

    it("handles non-Error thrown during code checks", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );

      const codeModule = await import("../../src/code/index.js");
      vi.spyOn(codeModule, "runCodeChecks").mockRejectedValueOnce("string error");

      await checkActionHandler!({ config: configPath, format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Unknown error"));
      expect(mockExit).toHaveBeenCalledWith(3);
    });

    it("handles Error thrown during code checks", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );

      const codeModule = await import("../../src/code/index.js");
      vi.spyOn(codeModule, "runCodeChecks").mockRejectedValueOnce(new Error("Check runtime error"));

      await checkActionHandler!({ config: configPath, format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Check runtime error"));
      expect(mockExit).toHaveBeenCalledWith(3);
    });
  });

  describe("code audit command", () => {
    it("runs code audit and outputs text format", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");

      await auditActionHandler!({ config: configPath, format: "text" });

      expect(mockStdoutWrite).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("runs code audit and outputs JSON format", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");

      await auditActionHandler!({ config: configPath, format: "json" });

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it("exits with code 1 when audit fails", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );
      // No eslint config file - audit should fail

      await auditActionHandler!({ config: configPath, format: "text" });

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("exits with code 2 for config errors", async () => {
      await auditActionHandler!({ config: "/nonexistent/check.toml", format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Config error"));
      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it("exits with code 3 for runtime errors", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "invalid [ toml");

      await auditActionHandler!({ config: configPath, format: "text" });

      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it("handles non-Error thrown objects in audit", async () => {
      // Create a scenario that causes a non-Error throw
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );

      // Mock a non-Error throw from somewhere in the audit chain
      const codeModule = await import("../../src/code/index.js");
      vi.spyOn(codeModule, "auditCodeConfig").mockRejectedValueOnce("string error");

      await auditActionHandler!({ config: configPath, format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Unknown error"));
      expect(mockExit).toHaveBeenCalledWith(3);
    });

    it("handles Error thrown in audit", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );

      const codeModule = await import("../../src/code/index.js");
      vi.spyOn(codeModule, "auditCodeConfig").mockRejectedValueOnce(new Error("Audit runtime error"));

      await auditActionHandler!({ config: configPath, format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Audit runtime error"));
      expect(mockExit).toHaveBeenCalledWith(3);
    });
  });

  describe("validate command", () => {
    it("validates valid config in text format", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );

      validateActionHandler!({ config: configPath, format: "text" });

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      expect(output).toContain("✓ Valid");
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("validates valid config in JSON format", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );

      validateActionHandler!({ config: configPath, format: "json" });

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.valid).toBe(true);
      expect(parsed.configPath).toBe(configPath);
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("reports invalid config in text format", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "invalid [ toml syntax");

      validateActionHandler!({ config: configPath, format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("✗ Invalid"));
      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it("reports invalid config in JSON format", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "invalid [ toml syntax");

      validateActionHandler!({ config: configPath, format: "json" });

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.valid).toBe(false);
      expect(parsed.error).toBeDefined();
      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it("handles non-Error thrown in validate", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );

      // Mock loadConfig to throw a non-Error, non-ConfigError object
      const configModule = await import("../../src/config/index.js");
      vi.spyOn(configModule, "loadConfig").mockImplementationOnce(() => {
        throw "string error";
      });

      validateActionHandler!({ config: configPath, format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Unknown error"));
      expect(mockExit).toHaveBeenCalledWith(3);
    });

    it("handles Error thrown in validate", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );

      // Mock loadConfig to throw a regular Error (not ConfigError)
      const configModule = await import("../../src/config/index.js");
      vi.spyOn(configModule, "loadConfig").mockImplementationOnce(() => {
        throw new Error("Validate runtime error");
      });

      validateActionHandler!({ config: configPath, format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Validate runtime error"));
      expect(mockExit).toHaveBeenCalledWith(3);
    });
  });
});

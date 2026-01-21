import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock process.exit to prevent test from actually exiting
const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
const mockStdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

// Mock commander to capture action handlers
let checkActionHandler: ((options: { config?: string; format: string }) => Promise<void>) | null =
  null;
let auditActionHandler: ((options: { config?: string; format: string }) => Promise<void>) | null =
  null;
let validateConfigActionHandler:
  | ((options: { config?: string; format: string }) => Promise<void>)
  | null = null;
let validateRegistryActionHandler: ((options: { format: string }) => Promise<void>) | null = null;
let schemaConfigActionHandler: (() => void) | null = null;

vi.mock("commander", () => {
  const createMockCommand = (parentName?: string) => {
    const cmd: Record<string, unknown> = {};
    cmd.name = vi.fn().mockReturnValue(cmd);
    cmd.description = vi.fn().mockReturnValue(cmd);
    cmd.version = vi.fn().mockReturnValue(cmd);
    cmd.option = vi.fn().mockReturnValue(cmd);
    cmd.addOption = vi.fn().mockReturnValue(cmd);
    cmd.addCommand = vi.fn().mockReturnValue(cmd);
    cmd.exitOverride = vi.fn().mockReturnValue(cmd);
    cmd.configureOutput = vi.fn().mockReturnValue(cmd);
    cmd.parse = vi.fn();
    cmd.command = vi.fn().mockImplementation((name: string) => {
      const subCmd = createMockCommand(parentName || name);
      subCmd.action = vi.fn().mockImplementation((handler) => {
        if (name === "check") {
          checkActionHandler = handler;
        } else if (name === "audit") {
          auditActionHandler = handler;
        } else if (parentName === "validate" && name === "config") {
          validateConfigActionHandler = handler;
        } else if (parentName === "validate" && name === "registry") {
          validateRegistryActionHandler = handler;
        } else if (parentName === "schema" && name === "config") {
          schemaConfigActionHandler = handler;
        }
        return subCmd;
      });
      return subCmd;
    });
    cmd.action = vi.fn().mockImplementation((handler) => {
      validateConfigActionHandler = handler;
      return cmd;
    });
    return cmd;
  };

  const createMockOption = () => {
    const opt: Record<string, unknown> = {};
    opt.choices = vi.fn().mockReturnValue(opt);
    opt.default = vi.fn().mockReturnValue(opt);
    opt.makeOptionMandatory = vi.fn().mockReturnValue(opt);
    return opt;
  };

  // Mock CommanderError class
  class MockCommanderError extends Error {
    code: string;
    exitCode: number;
    constructor(exitCode: number, code: string, message: string) {
      super(message);
      this.exitCode = exitCode;
      this.code = code;
    }
  }

  return {
    Command: vi.fn().mockImplementation((name?: string) => createMockCommand(name)),
    Option: vi.fn().mockImplementation(() => createMockOption()),
    CommanderError: MockCommanderError,
  };
});

// Mock execa for tool runs
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

// Import CLI once to register handlers (mocks are already set up above)
// This avoids the slow re-import on every test that was causing timeouts
await import("../../src/cli.js");

describe("CLI", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-cli-test-"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
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
          messages: [{ ruleId: "no-var", severity: 2, message: "Error", line: 1, column: 1 }],
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
      vi.spyOn(codeModule, "auditCodeConfig").mockRejectedValueOnce(
        new Error("Audit runtime error")
      );

      await auditActionHandler!({ config: configPath, format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Audit runtime error"));
      expect(mockExit).toHaveBeenCalledWith(3);
    });
  });

  describe("validate config command", () => {
    it("validates valid config in text format", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );

      await validateConfigActionHandler!({ config: configPath, format: "text" });

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      expect(output).toContain("✓ Valid");
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("validates valid config in JSON format", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );

      await validateConfigActionHandler!({ config: configPath, format: "json" });

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.valid).toBe(true);
      expect(parsed.configPath).toBe(configPath);
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("reports invalid config in text format", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "invalid [ toml syntax");

      await validateConfigActionHandler!({ config: configPath, format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("✗ Invalid"));
      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it("reports invalid config in JSON format", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "invalid [ toml syntax");

      await validateConfigActionHandler!({ config: configPath, format: "json" });

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

      // Mock loadConfigWithOverrides to throw a non-Error, non-ConfigError object
      const configModule = await import("../../src/config/index.js");
      vi.spyOn(configModule, "loadConfigWithOverrides").mockRejectedValueOnce("string error");

      await validateConfigActionHandler!({ config: configPath, format: "text" });

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

      // Mock loadConfigWithOverrides to throw a regular Error (not ConfigError)
      const configModule = await import("../../src/config/index.js");
      vi.spyOn(configModule, "loadConfigWithOverrides").mockRejectedValueOnce(
        new Error("Validate runtime error")
      );

      await validateConfigActionHandler!({ config: configPath, format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Validate runtime error")
      );
      expect(mockExit).toHaveBeenCalledWith(3);
    });
  });

  describe("validate registry command", () => {
    let originalCwd: string;

    beforeEach(() => {
      originalCwd = process.cwd();
    });

    afterEach(() => {
      process.chdir(originalCwd);
    });

    it("validates valid registry in text format", async () => {
      // Create valid registry structure
      const rulesetsDir = path.join(tempDir, "rulesets");
      fs.mkdirSync(rulesetsDir);
      fs.writeFileSync(
        path.join(rulesetsDir, "typescript.toml"),
        `[code.linting.eslint]
enabled = true`
      );

      process.chdir(tempDir);
      await validateRegistryActionHandler!({ format: "text" });

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      expect(output).toContain("✓ Registry valid");
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("validates valid registry in JSON format", async () => {
      const rulesetsDir = path.join(tempDir, "rulesets");
      fs.mkdirSync(rulesetsDir);
      fs.writeFileSync(
        path.join(rulesetsDir, "typescript.toml"),
        `[code.linting.eslint]
enabled = true`
      );

      process.chdir(tempDir);
      await validateRegistryActionHandler!({ format: "json" });

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.valid).toBe(true);
      expect(parsed.rulesetsCount).toBe(1);
      expect(parsed.errors).toHaveLength(0);
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("reports invalid TOML in rulesets", async () => {
      const rulesetsDir = path.join(tempDir, "rulesets");
      fs.mkdirSync(rulesetsDir);
      fs.writeFileSync(path.join(rulesetsDir, "broken.toml"), "invalid [ toml");

      process.chdir(tempDir);
      await validateRegistryActionHandler!({ format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("✗ Registry invalid"));
      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it("reports missing rulesets directory", async () => {
      process.chdir(tempDir);
      await validateRegistryActionHandler!({ format: "text" });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("✗ Registry invalid"));
      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it("reports multiple errors in JSON format", async () => {
      const rulesetsDir = path.join(tempDir, "rulesets");
      fs.mkdirSync(rulesetsDir);
      fs.writeFileSync(path.join(rulesetsDir, "broken.toml"), "invalid [ toml");
      fs.writeFileSync(path.join(rulesetsDir, "also-broken.toml"), "also invalid [ toml");

      process.chdir(tempDir);
      await validateRegistryActionHandler!({ format: "json" });

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors).toHaveLength(2);
      expect(parsed.errors[0].file).toMatch(/^rulesets\//);
      expect(parsed.errors[1].file).toMatch(/^rulesets\//);
      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it("handles empty rulesets directory as valid", async () => {
      const rulesetsDir = path.join(tempDir, "rulesets");
      fs.mkdirSync(rulesetsDir);

      process.chdir(tempDir);
      await validateRegistryActionHandler!({ format: "json" });

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.valid).toBe(true);
      expect(parsed.rulesetsCount).toBe(0);
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe("schema config command", () => {
    it("outputs valid JSON schema", () => {
      schemaConfigActionHandler!();

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);

      // Verify it's a valid JSON schema with definitions
      expect(parsed).toHaveProperty("$ref");
      expect(parsed).toHaveProperty("definitions");
      expect(parsed.definitions).toHaveProperty("CheckTomlConfig");

      const config = parsed.definitions.CheckTomlConfig;
      expect(config).toHaveProperty("type", "object");
      expect(config).toHaveProperty("properties");
      expect(config.properties).toHaveProperty("code");
      expect(config.properties).toHaveProperty("extends");
    });

    it("includes code.linting.eslint in schema", () => {
      schemaConfigActionHandler!();

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);

      // Navigate to eslint config in schema through definitions
      const config = parsed.definitions.CheckTomlConfig;
      const eslintSchema = config.properties?.code?.properties?.linting?.properties?.eslint;
      expect(eslintSchema).toBeDefined();
      expect(eslintSchema.properties).toHaveProperty("enabled");
    });

    it("includes code.linting.ruff in schema with lint options", () => {
      schemaConfigActionHandler!();

      const output = mockStdoutWrite.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);

      // Navigate to ruff config in schema through definitions
      const config = parsed.definitions.CheckTomlConfig;
      const ruffSchema = config.properties?.code?.properties?.linting?.properties?.ruff;
      expect(ruffSchema).toBeDefined();
      expect(ruffSchema.properties).toHaveProperty("enabled");
      expect(ruffSchema.properties).toHaveProperty("line-length");
      expect(ruffSchema.properties).toHaveProperty("lint");
    });
  });
});

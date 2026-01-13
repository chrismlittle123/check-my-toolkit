import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ConfigError,
  findConfigFile,
  getProjectRoot,
  loadConfig,
} from "../../src/config/loader.js";

// For mocking fs in specific tests
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof fs>("node:fs");
  return {
    ...actual,
    default: actual,
  };
});

describe("findConfigFile", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("finds check.toml in current directory", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(configPath, "[code]");

    const result = findConfigFile(tempDir);
    expect(result).toBe(configPath);
  });

  it("finds check.toml in parent directory", () => {
    const subDir = path.join(tempDir, "subdir");
    fs.mkdirSync(subDir);
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(configPath, "[code]");

    const result = findConfigFile(subDir);
    expect(result).toBe(configPath);
  });

  it("finds check.toml in grandparent directory", () => {
    const subDir = path.join(tempDir, "subdir", "nested");
    fs.mkdirSync(subDir, { recursive: true });
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(configPath, "[code]");

    const result = findConfigFile(subDir);
    expect(result).toBe(configPath);
  });

  it("returns null when no config file exists", () => {
    const result = findConfigFile(tempDir);
    expect(result).toBeNull();
  });

  it("handles searching up to root without finding config", () => {
    // Create a deep nested directory
    const deepDir = path.join(tempDir, "a", "b", "c", "d", "e");
    fs.mkdirSync(deepDir, { recursive: true });

    const result = findConfigFile(deepDir);
    expect(result).toBeNull();
  });

  it("uses process.cwd() as default start directory", () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(tempDir);
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "[code]");

      const result = findConfigFile();
      // Handle symlink resolution (macOS /var -> /private/var)
      expect(fs.realpathSync(result!)).toBe(fs.realpathSync(configPath));
    } finally {
      process.chdir(originalCwd);
    }
  });
});

describe("loadConfig", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("loads and parses valid config", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[code.linting.eslint]
enabled = true

[code.linting.ruff]
enabled = false
`
    );

    const result = loadConfig(configPath);
    expect(result.configPath).toBe(configPath);
    expect(result.config.code?.linting?.eslint?.enabled).toBe(true);
    expect(result.config.code?.linting?.ruff?.enabled).toBe(false);
  });

  it("loads empty config and applies defaults", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(configPath, "");

    const result = loadConfig(configPath);
    expect(result.config.code).toBeDefined();
    expect(result.config.code?.linting?.eslint?.enabled).toBe(false);
    expect(result.config.code?.linting?.ruff?.enabled).toBe(false);
  });

  it("merges config with defaults", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[code.linting.eslint]
enabled = true
`
    );

    const result = loadConfig(configPath);
    // User config is merged
    expect(result.config.code?.linting?.eslint?.enabled).toBe(true);
    // Default is still applied for ruff
    expect(result.config.code?.linting?.ruff?.enabled).toBe(false);
    // Other defaults are applied
    expect(result.config.code?.types?.tsc?.enabled).toBe(false);
  });

  it("merges security config from user config", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[code.security.npmaudit]
enabled = true
`
    );

    const result = loadConfig(configPath);
    expect(result.config.code?.security?.npmaudit?.enabled).toBe(true);
    expect(result.config.code?.security?.pipaudit?.enabled).toBe(false);
  });

  it("handles security config with both tools enabled", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[code.security.npmaudit]
enabled = true

[code.security.pipaudit]
enabled = true
`
    );

    const result = loadConfig(configPath);
    expect(result.config.code?.security?.npmaudit?.enabled).toBe(true);
    expect(result.config.code?.security?.pipaudit?.enabled).toBe(true);
  });

  it("accepts valid process.pr config", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[process.pr]
enabled = true
max_files = 10
max_lines = 400
`
    );

    const result = loadConfig(configPath);
    expect(result.config.process?.pr?.enabled).toBe(true);
    expect(result.config.process?.pr?.max_files).toBe(10);
    expect(result.config.process?.pr?.max_lines).toBe(400);
  });

  it("loads valid process.tickets config", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[process.tickets]
enabled = true
pattern = "ABC-[0-9]+"
require_in_commits = true
require_in_branch = false
`
    );

    const result = loadConfig(configPath);
    expect(result.config.process?.tickets?.enabled).toBe(true);
    expect(result.config.process?.tickets?.pattern).toBe("ABC-[0-9]+");
    expect(result.config.process?.tickets?.require_in_commits).toBe(true);
    expect(result.config.process?.tickets?.require_in_branch).toBe(false);
  });

  it("accepts process.backups config", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[process.backups]
enabled = true
bucket = "my-bucket"
prefix = "backups/"
max_age_hours = 48
`
    );

    const { config } = loadConfig(configPath);
    expect(config.process?.backups?.enabled).toBe(true);
    expect(config.process?.backups?.bucket).toBe("my-bucket");
    expect(config.process?.backups?.prefix).toBe("backups/");
    expect(config.process?.backups?.max_age_hours).toBe(48);
  });

  it("rejects stack config (not implemented)", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[stack.tools]
node = ">=18"
`
    );

    expect(() => loadConfig(configPath)).toThrow(ConfigError);
    expect(() => loadConfig(configPath)).toThrow("Unrecognized key(s)");
  });

  it("throws ConfigError for missing config file", () => {
    expect(() => loadConfig("/nonexistent/check.toml")).toThrow(ConfigError);
    expect(() => loadConfig("/nonexistent/check.toml")).toThrow(
      "Config file not found"
    );
  });

  it("throws ConfigError when no config file found", () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(tempDir);
      expect(() => loadConfig()).toThrow(ConfigError);
      expect(() => loadConfig()).toThrow("No check.toml found");
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("throws ConfigError for invalid TOML syntax", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(configPath, "invalid [ toml syntax");

    expect(() => loadConfig(configPath)).toThrow(ConfigError);
    expect(() => loadConfig(configPath)).toThrow("Failed to parse check.toml");
  });

  it("throws ConfigError for invalid schema", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[code.linting.eslint]
enabled = "not-a-boolean"
`
    );

    expect(() => loadConfig(configPath)).toThrow(ConfigError);
    expect(() => loadConfig(configPath)).toThrow("Invalid check.toml");
  });

  it("ConfigError has correct name property", () => {
    try {
      loadConfig("/nonexistent/check.toml");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).name).toBe("ConfigError");
    }
  });
});

describe("getProjectRoot", () => {
  it("returns parent directory of config file", () => {
    const configPath = "/path/to/project/check.toml";
    expect(getProjectRoot(configPath)).toBe("/path/to/project");
  });

  it("handles nested paths", () => {
    const configPath = "/a/b/c/d/check.toml";
    expect(getProjectRoot(configPath)).toBe("/a/b/c/d");
  });

  it("handles root-level config", () => {
    const configPath = "/check.toml";
    expect(getProjectRoot(configPath)).toBe("/");
  });
});

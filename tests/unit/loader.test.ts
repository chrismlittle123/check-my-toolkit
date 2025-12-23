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

  it("merges files arrays from user config", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[code.files]
repo = ["src/**/*.ts"]
`
    );

    const result = loadConfig(configPath);
    expect(result.config.code?.files?.repo).toEqual(["src/**/*.ts"]);
    expect(result.config.code?.files?.tooling).toEqual([]);
    expect(result.config.code?.files?.docs).toEqual([]);
  });

  it("handles files config with all arrays specified", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[code.files]
repo = ["src/**/*.ts"]
tooling = ["eslint.config.js"]
docs = ["README.md"]
`
    );

    const result = loadConfig(configPath);
    expect(result.config.code?.files?.repo).toEqual(["src/**/*.ts"]);
    expect(result.config.code?.files?.tooling).toEqual(["eslint.config.js"]);
    expect(result.config.code?.files?.docs).toEqual(["README.md"]);
  });

  it("merges complexity settings", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[code.complexity]
max_file_lines = 500
`
    );

    const result = loadConfig(configPath);
    expect(result.config.code?.complexity?.max_file_lines).toBe(500);
  });

  it("merges process config", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[process.pr]
max_files = 10

[process.branches]
pattern = "^main$"
`
    );

    const result = loadConfig(configPath);
    expect(result.config.process?.pr?.max_files).toBe(10);
    expect(result.config.process?.branches?.pattern).toBe("^main$");
  });

  it("merges stack config", () => {
    const configPath = path.join(tempDir, "check.toml");
    fs.writeFileSync(
      configPath,
      `
[stack.tools]
node = ">=18"
`
    );

    const result = loadConfig(configPath);
    expect(result.config.stack?.tools?.node).toBe(">=18");
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

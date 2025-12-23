import * as fs from "node:fs";
import * as path from "node:path";

import TOML from "@iarna/toml";

import { type Config, configSchema, defaultConfig } from "./schema.js";

export interface LoadConfigResult {
  config: Config;
  configPath: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Find check.toml by walking up the directory tree
 */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const configPath = path.join(currentDir, "check.toml");
    if (fs.existsSync(configPath)) {
      return configPath;
    }
    currentDir = path.dirname(currentDir);
  }

  // Check root directory too
  const rootConfig = path.join(root, "check.toml");
  if (fs.existsSync(rootConfig)) {
    return rootConfig;
  }

  return null;
}

/**
 * Load and parse check.toml configuration
 */
export function loadConfig(configPath?: string): LoadConfigResult {
  // Find config file if not specified
  const resolvedPath = configPath ?? findConfigFile();

  if (!resolvedPath) {
    throw new ConfigError(
      "No check.toml found. Run 'cm init' to create one or specify --config path."
    );
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new ConfigError(`Config file not found: ${resolvedPath}`);
  }

  // Read and parse TOML
  let rawConfig: unknown;
  try {
    const content = fs.readFileSync(resolvedPath, "utf-8");
    rawConfig = TOML.parse(content);
  } catch (error) {
    if (error instanceof Error) {
      throw new ConfigError(`Failed to parse check.toml: ${error.message}`);
    }
    throw new ConfigError("Failed to parse check.toml");
  }

  // Validate with Zod
  const result = configSchema.safeParse(rawConfig);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new ConfigError(`Invalid check.toml configuration:\n${errors}`);
  }

  // Merge with defaults
  const config = mergeWithDefaults(result.data);

  return {
    config,
    configPath: resolvedPath,
  };
}

/**
 * Deep merge config with defaults
 */
function mergeWithDefaults(config: Config): Config {
  return {
    code: {
      linting: {
        eslint: config.code?.linting?.eslint ?? defaultConfig.code?.linting?.eslint ?? false,
        ruff: config.code?.linting?.ruff ?? defaultConfig.code?.linting?.ruff ?? false,
      },
      types: {
        tsc: config.code?.types?.tsc ?? defaultConfig.code?.types?.tsc ?? false,
      },
      files: {
        repo: config.code?.files?.repo ?? defaultConfig.code?.files?.repo ?? [],
        tooling: config.code?.files?.tooling ?? defaultConfig.code?.files?.tooling ?? [],
        docs: config.code?.files?.docs ?? defaultConfig.code?.files?.docs ?? [],
      },
    },
    process: {
      pr: config.process?.pr ?? defaultConfig.process?.pr ?? {},
      branches: config.process?.branches ?? defaultConfig.process?.branches ?? {},
      tickets: config.process?.tickets ?? defaultConfig.process?.tickets ?? {},
    },
    stack: {
      tools: config.stack?.tools ?? defaultConfig.stack?.tools ?? {},
    },
  };
}

/**
 * Get the project root directory (where check.toml is located)
 */
export function getProjectRoot(configPath: string): string {
  return path.dirname(configPath);
}

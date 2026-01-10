import * as fs from "node:fs";
import * as path from "node:path";

import TOML from "@iarna/toml";

import { resolveExtends } from "./registry.js";
import { type Config, configSchema, defaultConfig } from "./schema.js";

interface LoadConfigResult {
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
 * Check if a path is a broken symlink
 */
function isBrokenSymlink(filePath: string): boolean {
  try {
    const stats = fs.lstatSync(filePath);
    if (stats.isSymbolicLink()) {
      // It's a symlink - check if target exists
      try {
        fs.statSync(filePath);
        return false; // Target exists, not broken
      } catch {
        return true; // Target doesn't exist, broken symlink
      }
    }
    return false; // Not a symlink
  } catch {
    return false; // Path doesn't exist at all
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
    if (isBrokenSymlink(configPath)) {
      throw new ConfigError(`check.toml exists but is a broken symlink: ${configPath}`);
    }
    if (fs.existsSync(configPath)) {
      return configPath;
    }
    currentDir = path.dirname(currentDir);
  }

  // Check root directory too
  const rootConfig = path.join(root, "check.toml");
  if (isBrokenSymlink(rootConfig)) {
    throw new ConfigError(`check.toml exists but is a broken symlink: ${rootConfig}`);
  }
  return fs.existsSync(rootConfig) ? rootConfig : null;
}

/**
 * Resolve and validate config file path
 */
function resolveConfigPath(configPath?: string): string {
  const resolved = configPath ?? findConfigFile();
  if (!resolved) {
    throw new ConfigError("No check.toml found. Create one or specify --config path.");
  }
  if (!fs.existsSync(resolved)) {
    throw new ConfigError(`Config file not found: ${resolved}`);
  }
  return resolved;
}

/**
 * Parse TOML file content
 */
function parseTomlFile(filePath: string): unknown {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return TOML.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new ConfigError(`Failed to parse check.toml: ${message}`);
  }
}

/**
 * Validate config against schema
 */
function validateConfig(rawConfig: unknown): Config {
  const result = configSchema.safeParse(rawConfig);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `  - ${e.path.join(".")}: ${e.message}`).join("\n");
    throw new ConfigError(`Invalid check.toml configuration:\n${errors}`);
  }
  return result.data;
}

/**
 * Load and parse check.toml configuration (sync version without extends resolution)
 * Use loadConfigAsync for full extends support
 */
export function loadConfig(configPath?: string): LoadConfigResult {
  const resolvedPath = resolveConfigPath(configPath);
  const rawConfig = parseTomlFile(resolvedPath);
  const validatedConfig = validateConfig(rawConfig);
  const config = mergeWithDefaults(validatedConfig);
  return { config, configPath: resolvedPath };
}

/**
 * Load and parse check.toml configuration with extends resolution
 */
export async function loadConfigAsync(configPath?: string): Promise<LoadConfigResult> {
  const resolvedPath = resolveConfigPath(configPath);
  const rawConfig = parseTomlFile(resolvedPath);
  const validatedConfig = validateConfig(rawConfig);

  // Resolve extends if present
  const configDir = path.dirname(resolvedPath);
  const resolvedConfig = await resolveExtends(validatedConfig, configDir);

  const config = mergeWithDefaults(resolvedConfig);
  return { config, configPath: resolvedPath };
}

/** Merge two optional objects, with right side taking precedence */
function merge<T extends object>(a: T | undefined, b: T | undefined): T {
  return { ...a, ...b } as T;
}

type CodeConfig = NonNullable<Config["code"]>;

function mergeLinting(c: Config, dc: Config): CodeConfig["linting"] {
  const cl = c.code?.linting;
  const dl = dc.code?.linting;
  return { eslint: merge(dl?.eslint, cl?.eslint), ruff: merge(dl?.ruff, cl?.ruff) };
}

function mergeSecurity(c: Config, dc: Config): CodeConfig["security"] {
  const cs = c.code?.security;
  const ds = dc.code?.security;
  return {
    secrets: merge(ds?.secrets, cs?.secrets),
    npmaudit: merge(ds?.npmaudit, cs?.npmaudit),
    pipaudit: merge(ds?.pipaudit, cs?.pipaudit),
  };
}

function mergeTypes(c: Config, dc: Config): CodeConfig["types"] {
  return {
    tsc: merge(dc.code?.types?.tsc, c.code?.types?.tsc),
    ty: merge(dc.code?.types?.ty, c.code?.types?.ty),
  };
}

function mergeUnused(c: Config, dc: Config): CodeConfig["unused"] {
  return {
    knip: merge(dc.code?.unused?.knip, c.code?.unused?.knip),
    vulture: merge(dc.code?.unused?.vulture, c.code?.unused?.vulture),
  };
}

function mergeFormatting(c: Config, dc: Config): CodeConfig["formatting"] {
  return {
    prettier: merge(dc.code?.formatting?.prettier, c.code?.formatting?.prettier),
  };
}

function mergeTests(c: Config, dc: Config): CodeConfig["tests"] {
  return merge(dc.code?.tests, c.code?.tests);
}

function mergeNaming(c: Config, dc: Config): CodeConfig["naming"] {
  const cn = c.code?.naming;
  const dn = dc.code?.naming;
  // For naming, we want to preserve the rules array from user config
  return {
    enabled: cn?.enabled ?? dn?.enabled ?? false,
    rules: cn?.rules ?? dn?.rules,
  };
}

function mergeQuality(c: Config, dc: Config): CodeConfig["quality"] {
  const cq = c.code?.quality;
  const dq = dc.code?.quality;
  return {
    "disable-comments": merge(dq?.["disable-comments"], cq?.["disable-comments"]),
  };
}

function mergeCode(c: Config, dc: Config): CodeConfig {
  return {
    linting: mergeLinting(c, dc),
    formatting: mergeFormatting(c, dc),
    types: mergeTypes(c, dc),
    unused: mergeUnused(c, dc),
    tests: mergeTests(c, dc),
    security: mergeSecurity(c, dc),
    naming: mergeNaming(c, dc),
    quality: mergeQuality(c, dc),
  };
}

type ProcessConfig = NonNullable<Config["process"]>;
type HooksConfig = NonNullable<ProcessConfig["hooks"]>;

const defaultHooks: HooksConfig = { enabled: false, require_husky: true };

function mergeProcess(c: Config, dc: Config): ProcessConfig {
  const hooks: HooksConfig = {
    ...defaultHooks,
    ...dc.process?.hooks,
    ...c.process?.hooks,
  };
  return { hooks };
}

/**
 * Deep merge config with defaults
 */
function mergeWithDefaults(config: Config): Config {
  return {
    code: mergeCode(config, defaultConfig),
    process: mergeProcess(config, defaultConfig),
  };
}

/**
 * Get the project root directory (where check.toml is located)
 */
export function getProjectRoot(configPath: string): string {
  return path.dirname(configPath);
}

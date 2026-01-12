import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import * as toml from "@iarna/toml";
import { execa } from "execa";

import { ConfigError } from "./loader.js";
import { type Config, configSchema } from "./schema.js";

interface RegistryLocation {
  type: "github" | "local";
  owner?: string;
  repo?: string;
  ref?: string;
  path: string;
}

function parseGitHubUrl(url: string): RegistryLocation {
  const rest = url.slice(7);
  const [repoPath, ref] = rest.split("@");
  const [owner, repo] = repoPath.split("/");

  if (!owner || !repo) {
    throw new ConfigError(`Invalid GitHub registry URL: ${url}. Expected format: github:owner/repo`);
  }

  return {
    type: "github",
    owner,
    repo,
    ref: ref || undefined,
    path: `https://github.com/${owner}/${repo}.git`,
  };
}

export function parseRegistryUrl(url: string, configDir?: string): RegistryLocation {
  if (url.startsWith("github:")) {
    return parseGitHubUrl(url);
  }

  const localPath = !path.isAbsolute(url) && configDir ? path.resolve(configDir, url) : url;
  return { type: "local", path: localPath };
}

async function updateExistingRepo(repoDir: string, ref?: string): Promise<boolean> {
  try {
    if (ref) {
      await execa("git", ["fetch", "--all"], { cwd: repoDir });
      await execa("git", ["checkout", ref], { cwd: repoDir });
    } else {
      await execa("git", ["pull", "--ff-only"], { cwd: repoDir });
    }
    return true;
  } catch {
    fs.rmSync(repoDir, { recursive: true, force: true });
    return false;
  }
}

async function cloneRepo(location: RegistryLocation, repoDir: string): Promise<void> {
  const cacheDir = path.dirname(repoDir);
  fs.mkdirSync(cacheDir, { recursive: true });

  const cloneArgs = ["clone", "--depth", "1"];
  if (location.ref) {
    cloneArgs.push("--branch", location.ref);
  }
  cloneArgs.push(location.path, repoDir);

  try {
    await execa("git", cloneArgs, { timeout: 30 * 1000 }); // 30 second timeout
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("timed out")) {
      throw new ConfigError(`Registry clone timed out after 30 seconds: ${location.path}`);
    }
    throw new ConfigError(`Failed to clone registry: ${message}`);
  }
}

export async function fetchRegistry(location: RegistryLocation): Promise<string> {
  if (location.type === "local") {
    if (!fs.existsSync(location.path)) {
      throw new ConfigError(`Registry not found: ${location.path}`);
    }
    return location.path;
  }

  const cacheDir = path.join(os.tmpdir(), "cm-registry-cache");
  const repoDir = path.join(cacheDir, `${location.owner}-${location.repo}`);

  if (fs.existsSync(repoDir)) {
    await updateExistingRepo(repoDir, location.ref);
  }

  if (!fs.existsSync(repoDir)) {
    await cloneRepo(location, repoDir);
  }

  return repoDir;
}

export function loadRuleset(registryDir: string, rulesetName: string): Config {
  const rulesetPath = path.join(registryDir, "rulesets", `${rulesetName}.toml`);

  if (!fs.existsSync(rulesetPath)) {
    throw new ConfigError(`Ruleset not found: ${rulesetName} (expected at ${rulesetPath})`);
  }

  const content = fs.readFileSync(rulesetPath, "utf-8");

  let parsed: unknown;
  try {
    parsed = toml.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`Failed to parse ruleset ${rulesetName}: ${message}`);
  }

  const result = configSchema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    throw new ConfigError(`Invalid ruleset ${rulesetName}: ${errors}`);
  }

  return result.data;
}

type CodeConfig = NonNullable<Config["code"]>;

function mergeToolConfig<T extends object>(base?: T, override?: T): T | undefined {
  if (!override) {
    return base;
  }
  return { ...base, ...override };
}

function mergeLinting(base: CodeConfig["linting"], override: CodeConfig["linting"]): CodeConfig["linting"] {
  if (!override) {
    return base;
  }
  return {
    ...base,
    eslint: mergeToolConfig(base?.eslint, override.eslint),
    ruff: mergeToolConfig(base?.ruff, override.ruff),
  };
}

function mergeFormatting(base: CodeConfig["formatting"], override: CodeConfig["formatting"]): CodeConfig["formatting"] {
  if (!override) {
    return base;
  }
  return {
    ...base,
    prettier: mergeToolConfig(base?.prettier, override.prettier),
  };
}

function mergeTypes(base: CodeConfig["types"], override: CodeConfig["types"]): CodeConfig["types"] {
  if (!override) {
    return base;
  }
  return {
    ...base,
    tsc: mergeToolConfig(base?.tsc, override.tsc),
    ty: mergeToolConfig(base?.ty, override.ty),
  };
}

function mergeUnused(base: CodeConfig["unused"], override: CodeConfig["unused"]): CodeConfig["unused"] {
  if (!override) {
    return base;
  }
  return {
    ...base,
    knip: mergeToolConfig(base?.knip, override.knip),
    vulture: mergeToolConfig(base?.vulture, override.vulture),
  };
}

function mergeSecurity(base: CodeConfig["security"], override: CodeConfig["security"]): CodeConfig["security"] {
  if (!override) {
    return base;
  }
  return {
    ...base,
    secrets: mergeToolConfig(base?.secrets, override.secrets),
    npmaudit: mergeToolConfig(base?.npmaudit, override.npmaudit),
    pipaudit: mergeToolConfig(base?.pipaudit, override.pipaudit),
  };
}

function mergeNaming(base: CodeConfig["naming"], override: CodeConfig["naming"]): CodeConfig["naming"] {
  if (!override) {
    return base;
  }
  // enabled has a default value from schema, so it's always defined after parsing
  return {
    enabled: override.enabled,
    rules: override.rules ?? base?.rules,
  };
}

function mergeQuality(base: CodeConfig["quality"], override: CodeConfig["quality"]): CodeConfig["quality"] {
  if (!override) {
    return base;
  }
  return {
    ...base,
    "disable-comments": mergeToolConfig(base?.["disable-comments"], override["disable-comments"]),
  };
}

function mergeCodeSection(base: CodeConfig | undefined, override: CodeConfig): CodeConfig {
  return {
    linting: mergeLinting(base?.linting, override.linting),
    formatting: mergeFormatting(base?.formatting, override.formatting),
    types: mergeTypes(base?.types, override.types),
    unused: mergeUnused(base?.unused, override.unused),
    tests: mergeToolConfig(base?.tests, override.tests),
    security: mergeSecurity(base?.security, override.security),
    naming: mergeNaming(base?.naming, override.naming),
    quality: mergeQuality(base?.quality, override.quality),
  };
}

type ProcessConfig = NonNullable<Config["process"]>;

function mergeHooksConfig(base: ProcessConfig["hooks"], override: ProcessConfig["hooks"]): ProcessConfig["hooks"] {
  if (!override) {
    return base;
  }
  // enabled and require_husky have schema defaults, so they're always defined
  return {
    enabled: override.enabled,
    require_husky: override.require_husky,
    require_hooks: override.require_hooks ?? base?.require_hooks,
    commands: override.commands ?? base?.commands,
  };
}

function mergeCiConfig(base: ProcessConfig["ci"], override: ProcessConfig["ci"]): ProcessConfig["ci"] {
  if (!override) {
    return base;
  }
  return {
    enabled: override.enabled,
    require_workflows: override.require_workflows ?? base?.require_workflows,
    jobs: override.jobs ?? base?.jobs,
    actions: override.actions ?? base?.actions,
  };
}

function mergeProcessSection(base: ProcessConfig | undefined, override: ProcessConfig): ProcessConfig {
  return {
    hooks: mergeHooksConfig(base?.hooks, override.hooks),
    ci: mergeCiConfig(base?.ci, override.ci),
  };
}

export function mergeConfigs(base: Config, override: Config): Config {
  const merged: Config = { ...base };

  if (override.code) {
    merged.code = mergeCodeSection(base.code, override.code);
  }

  if (override.process) {
    merged.process = mergeProcessSection(base.process, override.process);
  }

  return merged;
}

export async function resolveExtends(config: Config, configDir: string): Promise<Config> {
  if (!config.extends) {
    return config;
  }

  const { registry, rulesets } = config.extends;
  const location = parseRegistryUrl(registry, configDir);
  const registryDir = await fetchRegistry(location);

  let mergedConfig: Config = {};
  for (const rulesetName of rulesets) {
    const ruleset = loadRuleset(registryDir, rulesetName);
    mergedConfig = mergeConfigs(mergedConfig, ruleset);
  }

  // Local config overrides registry config (include all domains)
  const localConfig: Config = {
    code: config.code,
    process: config.process,
  };
  return mergeConfigs(mergedConfig, localConfig);
}

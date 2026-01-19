import * as fs from "node:fs";
import * as path from "node:path";

import TOML from "@iarna/toml";
import chalk from "chalk";
import * as yaml from "js-yaml";

import { findConfigFile, getProjectRoot } from "../config/index.js";
import type { RepoMetadata, Tier, ValidateTierOptions, ValidateTierResult } from "./types.js";

/** Default tier when not specified */
const DEFAULT_TIER: Tier = "internal";

/** Valid tier values */
const VALID_TIERS: readonly Tier[] = ["production", "internal", "prototype"];

/** Extends section from check.toml */
interface ExtendsConfig {
  registry?: string;
  rulesets?: string[];
}

/** Raw check.toml structure (just what we need) */
interface RawConfig {
  extends?: ExtendsConfig;
}

/**
 * Load and parse repo-metadata.yaml
 */
function loadRepoMetadata(projectRoot: string): RepoMetadata | null {
  const metadataPath = path.join(projectRoot, "repo-metadata.yaml");

  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(metadataPath, "utf-8");
    return yaml.load(content) as RepoMetadata;
  } catch {
    return null;
  }
}

/**
 * Load and parse check.toml to get extends section
 */
function loadExtendsConfig(configPath: string): ExtendsConfig | null {
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = TOML.parse(content) as RawConfig;
    return parsed.extends ?? null;
  } catch {
    return null;
  }
}

/**
 * Get tier from repo-metadata.yaml with validation
 */
function getTier(metadata: RepoMetadata | null): {
  tier: Tier;
  source: "repo-metadata.yaml" | "default";
} {
  if (!metadata?.tier) {
    return { tier: DEFAULT_TIER, source: "default" };
  }

  const tier = metadata.tier;
  if (!VALID_TIERS.includes(tier)) {
    return { tier: DEFAULT_TIER, source: "default" };
  }

  return { tier, source: "repo-metadata.yaml" };
}

/**
 * Check if rulesets include a tier-matching ruleset
 */
function findMatchingRulesets(rulesets: string[], tier: Tier): string[] {
  const suffix = `-${tier}`;
  return rulesets.filter((ruleset) => ruleset.endsWith(suffix));
}

/**
 * Resolve the config path from options
 */
function resolveConfigPath(options: ValidateTierOptions): string | null {
  if (options.config) {
    const absolutePath = path.resolve(options.config);
    return fs.existsSync(absolutePath) ? absolutePath : null;
  }
  return findConfigFile();
}

/**
 * Create result for missing config
 */
function createNotFoundResult(): ValidateTierResult {
  return {
    valid: false,
    tier: DEFAULT_TIER,
    tierSource: "default",
    rulesets: [],
    expectedPattern: `*-${DEFAULT_TIER}`,
    matchedRulesets: [],
    error: "No check.toml found",
  };
}

/**
 * Build the validation result
 */
function buildResult(
  tier: Tier,
  source: "repo-metadata.yaml" | "default",
  rulesets: string[],
  matchedRulesets: string[]
): ValidateTierResult {
  const expectedPattern = `*-${tier}`;
  const valid = rulesets.length === 0 || matchedRulesets.length > 0;

  return {
    valid,
    tier,
    tierSource: source,
    rulesets,
    expectedPattern,
    matchedRulesets,
    error: valid
      ? undefined
      : `No ruleset matching pattern '${expectedPattern}' found. Rulesets: [${rulesets.join(", ")}]`,
  };
}

/**
 * Validate that project tier matches its rulesets.
 * This is the programmatic API exported for library consumers.
 */
export function validateTierRuleset(options: ValidateTierOptions = {}): ValidateTierResult {
  const configPath = resolveConfigPath(options);
  if (!configPath) {
    return createNotFoundResult();
  }

  const projectRoot = getProjectRoot(configPath);
  const metadata = loadRepoMetadata(projectRoot);
  const { tier, source } = getTier(metadata);

  const extendsConfig = loadExtendsConfig(configPath);
  const rulesets = extendsConfig?.rulesets ?? [];
  const matchedRulesets = rulesets.length > 0 ? findMatchingRulesets(rulesets, tier) : [];

  return buildResult(tier, source, rulesets, matchedRulesets);
}

/**
 * Format tier validation result as text
 */
export function formatTierResultText(result: ValidateTierResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push(chalk.green("✓ Tier validation passed"));
    lines.push(`  Tier: ${result.tier} (source: ${result.tierSource})`);
    if (result.matchedRulesets.length > 0) {
      lines.push(`  Matching rulesets: ${result.matchedRulesets.join(", ")}`);
    } else {
      lines.push("  No extends configured (no tier constraint)");
    }
  } else {
    lines.push(chalk.red("✗ Tier validation failed"));
    lines.push(`  Tier: ${result.tier} (source: ${result.tierSource})`);
    lines.push(`  Expected pattern: ${result.expectedPattern}`);
    lines.push(`  Rulesets: [${result.rulesets.join(", ")}]`);
    if (result.error) {
      lines.push(chalk.red(`  Error: ${result.error}`));
    }
  }

  return lines.join("\n");
}

/**
 * Format tier validation result as JSON
 */
export function formatTierResultJson(result: ValidateTierResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Valid project tiers
 */
export type Tier = "production" | "internal" | "prototype";

/**
 * Parsed repo-metadata.yaml structure
 */
export interface RepoMetadata {
  tier?: Tier;
}

/**
 * Options for the tier validation command
 */
export interface ValidateTierOptions {
  /** Path to check.toml config file */
  config?: string;
  /** Output format */
  format?: "text" | "json";
}

/**
 * Result of tier validation
 */
export interface ValidateTierResult {
  /** Whether validation passed */
  valid: boolean;
  /** Project tier from repo-metadata.yaml (defaults to "internal") */
  tier: Tier;
  /** Source of tier value */
  tierSource: "repo-metadata.yaml" | "default";
  /** Rulesets from check.toml extends section */
  rulesets: string[];
  /** Expected ruleset suffix pattern */
  expectedPattern: string;
  /** Matched rulesets (those that satisfy the tier requirement) */
  matchedRulesets: string[];
  /** Error message if invalid */
  error?: string;
}

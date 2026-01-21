/**
 * check-my-toolkit - Unified project health checks
 */

// Types
export {
  type CheckResult,
  CheckResult as CheckResultBuilder,
  type DomainResult,
  DomainResult as DomainResultBuilder,
  type DomainStatus,
  // Exit codes
  ExitCode,
  type ExitCodeType,
  type FullResult,
  // Tool interface
  type IToolRunner,
  type Severity,
  // Core interfaces
  type Violation,
  // Builders (use these to create instances)
  Violation as ViolationBuilder,
  type ViolationOptions,
} from "./types/index.js";

// Config
export {
  type Config,
  ConfigError,
  configSchema,
  defaultConfig,
  findConfigFile,
  getProjectRoot,
  loadConfig,
} from "./config/index.js";

// Code domain
export {
  auditCodeConfig,
  BaseToolRunner,
  ESLintRunner,
  KnipRunner,
  NamingRunner,
  PrettierRunner,
  RuffFormatRunner,
  RuffRunner,
  runCodeChecks,
  TscRunner,
  TyRunner,
  VultureRunner,
} from "./code/index.js";

// Process domain
export {
  auditProcessConfig,
  BaseProcessToolRunner,
  HooksRunner,
  runProcessChecks,
} from "./process/index.js";

// Process scan (remote validation)
export {
  type RemoteRepoInfo,
  type ScanOptions,
  scanRepository,
  type ScanResult,
  validateProcess,
  type ValidateProcessOptions,
  type ValidateProcessResult,
} from "./process/scan/index.js";

// Output
export { formatJson, formatOutput, formatText, type OutputFormat } from "./output/index.js";

// Dependencies
export {
  type DependenciesOptions,
  type DependenciesResult,
  getDependencies,
} from "./dependencies/index.js";

// Validate
export {
  formatTierResultJson,
  formatTierResultText,
  type RepoMetadata,
  type Tier,
  type TierSourceDetail,
  VALID_TIERS,
  type ValidateTierOptions,
  type ValidateTierResult,
  validateTierRuleset,
} from "./validate/index.js";

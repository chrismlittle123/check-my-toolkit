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
  PrettierRunner,
  RuffFormatRunner,
  RuffRunner,
  runCodeChecks,
  TestsRunner,
  TscRunner,
  TyRunner,
  VultureRunner,
} from "./code/index.js";

// Output
export {
  formatJson,
  formatOutput,
  formatText,
  type OutputFormat,
} from "./output/index.js";

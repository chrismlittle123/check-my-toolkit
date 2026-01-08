import { type Config } from "../config/index.js";
import {
  type CheckResult,
  DomainResult,
  type IToolRunner,
} from "../types/index.js";
import { ESLintRunner, GitleaksRunner, KnipRunner, NpmAuditRunner, PipAuditRunner, PrettierRunner, RuffFormatRunner, RuffRunner, TestsRunner, TscRunner, TyRunner, VultureRunner } from "./tools/index.js";

// Tool runner instances (singletons for tools that don't need per-run config)
const eslint = new ESLintRunner();
const gitleaks = new GitleaksRunner();
const knip = new KnipRunner();
const npmaudit = new NpmAuditRunner();
const pipaudit = new PipAuditRunner();
const prettier = new PrettierRunner();
const ruffFormat = new RuffFormatRunner();
const ty = new TyRunner();
const vulture = new VultureRunner();

// Note: RuffRunner and TscRunner are created per-run to support config from check.toml

// Export tool runners for direct access
export { BaseToolRunner, ESLintRunner, KnipRunner, PrettierRunner, RuffFormatRunner, RuffRunner, TestsRunner, TscRunner, TyRunner, VultureRunner } from "./tools/index.js";

/** Tool configuration entry mapping config getter to runner or runner factory */
interface ToolEntry {
  isEnabled: (config: Config) => boolean;
  runner: IToolRunner | ((config: Config) => IToolRunner);
}

/** Check if a tool is enabled in config */
function isEnabled(toolConfig: { enabled?: boolean } | undefined): boolean {
  return toolConfig?.enabled === true;
}

/** Create a configured TestsRunner */
function createTestsRunner(config: Config): TestsRunner {
  const runner = new TestsRunner();
  runner.setConfig({
    enabled: config.code?.tests?.enabled,
    pattern: config.code?.tests?.pattern,
    min_test_files: config.code?.tests?.min_test_files,
  });
  return runner;
}

/** Create a configured RuffRunner */
function createRuffRunner(config: Config): RuffRunner {
  const runner = new RuffRunner();
  const ruffConfig = config.code?.linting?.ruff;
  if (ruffConfig) {
    runner.setConfig({
      enabled: ruffConfig.enabled,
      format: ruffConfig.format,
      "line-length": ruffConfig["line-length"],
      lint: ruffConfig.lint,
    });
  }
  return runner;
}

/** Create a configured TscRunner */
function createTscRunner(config: Config): TscRunner {
  const runner = new TscRunner();
  const tscConfig = config.code?.types?.tsc;
  if (tscConfig?.require) {
    runner.setRequiredOptions(tscConfig.require);
  }
  return runner;
}

/** All available tools with their config predicates */
const toolRegistry: ToolEntry[] = [
  { isEnabled: (c) => isEnabled(c.code?.linting?.eslint), runner: eslint },
  { isEnabled: (c) => isEnabled(c.code?.linting?.ruff), runner: createRuffRunner },
  { isEnabled: (c) => isEnabled(c.code?.linting?.ruff) && c.code?.linting?.ruff?.format === true, runner: ruffFormat },
  { isEnabled: (c) => isEnabled(c.code?.formatting?.prettier), runner: prettier },
  { isEnabled: (c) => isEnabled(c.code?.types?.tsc), runner: createTscRunner },
  { isEnabled: (c) => isEnabled(c.code?.types?.ty), runner: ty },
  { isEnabled: (c) => isEnabled(c.code?.unused?.knip), runner: knip },
  { isEnabled: (c) => isEnabled(c.code?.unused?.vulture), runner: vulture },
  { isEnabled: (c) => isEnabled(c.code?.security?.secrets), runner: gitleaks },
  { isEnabled: (c) => isEnabled(c.code?.security?.npmaudit), runner: npmaudit },
  { isEnabled: (c) => isEnabled(c.code?.security?.pipaudit), runner: pipaudit },
  { isEnabled: (c) => isEnabled(c.code?.tests), runner: createTestsRunner },
];

/**
 * Get enabled tools based on configuration
 */
function getEnabledTools(config: Config): IToolRunner[] {
  return toolRegistry
    .filter((entry) => entry.isEnabled(config))
    .map((entry) => (typeof entry.runner === "function" ? entry.runner(config) : entry.runner));
}

/**
 * Run all code checks based on configuration
 */
export async function runCodeChecks(
  projectRoot: string,
  config: Config
): Promise<DomainResult> {
  const tools = getEnabledTools(config);
  const checks = await runTools(tools, projectRoot, "run");
  return DomainResult.fromChecks("code", checks);
}

/**
 * Audit code configuration (check that configs exist without running tools)
 */
export async function auditCodeConfig(
  projectRoot: string,
  config: Config
): Promise<DomainResult> {
  const tools = getEnabledTools(config);
  const checks = await runTools(tools, projectRoot, "audit");
  return DomainResult.fromChecks("code", checks);
}

/**
 * Run tools in parallel with error isolation
 * Uses Promise.allSettled to ensure one failing tool doesn't lose all results
 */
async function runTools(
  tools: IToolRunner[],
  projectRoot: string,
  mode: "run" | "audit"
): Promise<CheckResult[]> {
  const promises = tools.map((tool) =>
    mode === "run" ? tool.run(projectRoot) : tool.audit(projectRoot)
  );

  const results = await Promise.allSettled(promises);

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    // Handle rejected promise - create error result for the tool
    const tool = tools[index];
    const errorMessage = result.reason instanceof Error
      ? result.reason.message
      : "Unknown error";

    return {
      name: tool.name,
      rule: tool.rule,
      passed: false,
      violations: [{
        rule: tool.rule,
        tool: tool.toolId,
        message: `Tool error: ${errorMessage}`,
        severity: "error" as const,
      }],
      skipped: false,
      duration: 0,
    };
  });
}

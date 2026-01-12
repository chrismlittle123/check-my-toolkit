import { type Config } from "../config/index.js";
import {
  type CheckResult,
  DomainResult,
  type IToolRunner,
} from "../types/index.js";
import { BranchesRunner, CiRunner, HooksRunner } from "./tools/index.js";

// Export tool runners for direct access
export { BaseProcessToolRunner, BranchesRunner, CiRunner, HooksRunner } from "./tools/index.js";

/** Tool configuration entry mapping config getter to runner or runner factory */
interface ToolEntry {
  isEnabled: (config: Config) => boolean;
  runner: IToolRunner | ((config: Config) => IToolRunner);
}

/** Check if a tool is enabled in config */
function isEnabled(toolConfig: { enabled?: boolean } | undefined): boolean {
  return toolConfig?.enabled === true;
}

/** Create a configured HooksRunner */
function createHooksRunner(config: Config): HooksRunner {
  const runner = new HooksRunner();
  const hooksConfig = config.process?.hooks;
  if (hooksConfig) {
    runner.setConfig({
      enabled: hooksConfig.enabled,
      require_husky: hooksConfig.require_husky,
      require_hooks: hooksConfig.require_hooks,
      commands: hooksConfig.commands,
    });
  }
  return runner;
}

/** Create a configured CiRunner */
function createCiRunner(config: Config): CiRunner {
  const runner = new CiRunner();
  const ciConfig = config.process?.ci;
  if (ciConfig) {
    runner.setConfig({
      enabled: ciConfig.enabled,
      require_workflows: ciConfig.require_workflows,
      jobs: ciConfig.jobs,
      actions: ciConfig.actions,
    });
  }
  return runner;
}

/** Create a configured BranchesRunner */
function createBranchesRunner(config: Config): BranchesRunner {
  const runner = new BranchesRunner();
  const branchesConfig = config.process?.branches;
  if (branchesConfig) {
    runner.setConfig({
      enabled: branchesConfig.enabled,
      pattern: branchesConfig.pattern,
      exclude: branchesConfig.exclude,
    });
  }
  return runner;
}

/** All available process tools with their config predicates */
const toolRegistry: ToolEntry[] = [
  { isEnabled: (c) => isEnabled(c.process?.hooks), runner: createHooksRunner },
  { isEnabled: (c) => isEnabled(c.process?.ci), runner: createCiRunner },
  { isEnabled: (c) => isEnabled(c.process?.branches), runner: createBranchesRunner },
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
 * Run all process checks based on configuration
 */
export async function runProcessChecks(
  projectRoot: string,
  config: Config
): Promise<DomainResult> {
  const tools = getEnabledTools(config);
  const checks = await runTools(tools, projectRoot, "run");
  return DomainResult.fromChecks("process", checks);
}

/**
 * Audit process configuration (check that configs exist without running tools)
 */
export async function auditProcessConfig(
  projectRoot: string,
  config: Config
): Promise<DomainResult> {
  const tools = getEnabledTools(config);
  const checks = await runTools(tools, projectRoot, "audit");
  return DomainResult.fromChecks("process", checks);
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

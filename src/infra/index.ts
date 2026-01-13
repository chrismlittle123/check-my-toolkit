import { type Config } from "../config/index.js";
import {
  type CheckResult,
  DomainResult,
  type IToolRunner,
} from "../types/index.js";
import { TaggingRunner } from "./tools/index.js";

// Export tool runners for direct access
export { BaseInfraToolRunner, TaggingRunner } from "./tools/index.js";

/** Tool configuration entry mapping config getter to runner or runner factory */
interface ToolEntry {
  isEnabled: (config: Config) => boolean;
  runner: IToolRunner | ((config: Config) => IToolRunner);
}

/** Check if a tool is enabled in config */
function isEnabled(toolConfig: { enabled?: boolean } | undefined): boolean {
  return toolConfig?.enabled === true;
}

/** Create a configured TaggingRunner */
function createTaggingRunner(config: Config): TaggingRunner {
  const runner = new TaggingRunner();
  const taggingConfig = config.infra?.tagging;
  if (taggingConfig) {
    runner.setConfig({
      enabled: taggingConfig.enabled,
      region: taggingConfig.region,
      required: taggingConfig.required,
      values: taggingConfig.values,
    });
  }
  return runner;
}

/** All available infra tools with their config predicates */
const toolRegistry: ToolEntry[] = [
  { isEnabled: (c) => isEnabled(c.infra?.tagging), runner: createTaggingRunner },
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
 * Run all infra checks based on configuration
 */
export async function runInfraChecks(
  projectRoot: string,
  config: Config
): Promise<DomainResult> {
  const tools = getEnabledTools(config);
  const checks = await runTools(tools, projectRoot, "run");
  return DomainResult.fromChecks("infra", checks);
}

/**
 * Audit infra configuration (check that configs exist without running tools)
 */
export async function auditInfraConfig(
  projectRoot: string,
  config: Config
): Promise<DomainResult> {
  const tools = getEnabledTools(config);
  const checks = await runTools(tools, projectRoot, "audit");
  return DomainResult.fromChecks("infra", checks);
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

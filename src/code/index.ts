import { type Config } from "../config/index.js";
import {
  type CheckResult,
  DomainResult,
  type IToolRunner,
} from "../types/index.js";
import { ESLintRunner, RuffRunner, TscRunner } from "./tools/index.js";

// Tool runner instances
const eslint = new ESLintRunner();
const ruff = new RuffRunner();
const tsc = new TscRunner();

// Export tool runners for direct access
export { ESLintRunner, RuffRunner, TscRunner } from "./tools/index.js";
export { BaseToolRunner } from "./tools/index.js";

/**
 * Get enabled tools based on configuration
 */
function getEnabledTools(config: Config): IToolRunner[] {
  const tools: IToolRunner[] = [];

  if (config.code?.linting?.eslint?.enabled) {
    tools.push(eslint);
  }
  if (config.code?.linting?.ruff?.enabled) {
    tools.push(ruff);
  }
  if (config.code?.types?.tsc?.enabled) {
    tools.push(tsc);
  }

  return tools;
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
 * Run tools in parallel
 */
async function runTools(
  tools: IToolRunner[],
  projectRoot: string,
  mode: "run" | "audit"
): Promise<CheckResult[]> {
  const promises = tools.map((tool) =>
    mode === "run" ? tool.run(projectRoot) : tool.audit(projectRoot)
  );
  return Promise.all(promises);
}

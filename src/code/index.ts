import { type Config } from "../config/index.js";
import {
  type CheckResult,
  DomainResult,
  type IToolRunner,
} from "../types/index.js";
import { ESLintRunner, KnipRunner, RuffRunner, TscRunner, VultureRunner } from "./tools/index.js";

// Tool runner instances
const eslint = new ESLintRunner();
const knip = new KnipRunner();
const ruff = new RuffRunner();
const tsc = new TscRunner();
const vulture = new VultureRunner();

// Export tool runners for direct access
export { BaseToolRunner, ESLintRunner, KnipRunner, RuffRunner, TscRunner, VultureRunner } from "./tools/index.js";

/** Check if a tool is enabled in config */
function isEnabled(toolConfig: { enabled?: boolean } | undefined): boolean {
  return toolConfig?.enabled === true;
}

/**
 * Get enabled tools based on configuration
 */
function getEnabledTools(config: Config): IToolRunner[] {
  const code = config.code ?? {};
  const linting = code.linting ?? {};
  const types = code.types ?? {};
  const unused = code.unused ?? {};
  const tools: IToolRunner[] = [];

  if (isEnabled(linting.eslint)) tools.push(eslint);
  if (isEnabled(linting.ruff)) tools.push(ruff);
  if (isEnabled(types.tsc)) tools.push(tsc);
  if (isEnabled(unused.knip)) tools.push(knip);
  if (isEnabled(unused.vulture)) tools.push(vulture);

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

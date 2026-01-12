import * as path from "node:path";

import chalk from "chalk";

import { detectProjects, getProjectTypes } from "./detector.js";
import { createCheckToml, createRegistry } from "./templates.js";
import type { DetectionResult, DetectJsonOutput, DetectOptions, ProjectType } from "./types.js";

export { detectProjects } from "./detector.js";
export { createCheckToml, createRegistry, getExtendsTemplate,getTemplate } from "./templates.js";
export type { DetectOptions } from "./types.js";

/** Action taken during fix */
interface FixAction {
  action: string;
  path: string;
}

/** Write a line to stdout */
function writeLine(text: string): void {
  process.stdout.write(`${text}\n`);
}

/** Build JSON output structure */
function buildJsonOutput(result: DetectionResult, actions?: FixAction[]): DetectJsonOutput {
  const { projects, workspaceRoots } = result;

  return {
    projects: projects.map((p) => ({
      path: p.path,
      type: p.type,
      status: p.hasCheckToml ? ("has-config" as const) : ("missing-config" as const),
    })),
    workspaceRoots,
    summary: {
      total: projects.length,
      withConfig: projects.filter((p) => p.hasCheckToml).length,
      missingConfig: projects.filter((p) => !p.hasCheckToml).length,
    },
    actions: actions as DetectJsonOutput["actions"],
  };
}

/** Output detection results as JSON */
function outputJson(result: DetectionResult, actions?: FixAction[]): void {
  const output = buildJsonOutput(result, actions);
  writeLine(JSON.stringify(output, null, 2));
}

/** Output table header */
function outputTableHeader(pathWidth: number, typeWidth: number): void {
  writeLine(chalk.dim(`  ${"PATH".padEnd(pathWidth)}${"TYPE".padEnd(typeWidth)}STATUS`));
}

/** Output a single project row */
function outputProjectRow(project: { path: string; type: string; hasCheckToml: boolean }, pathWidth: number, typeWidth: number): void {
  const statusIcon = project.hasCheckToml ? chalk.green("\u2713") : chalk.red("\u2717");
  const statusText = project.hasCheckToml ? chalk.green("has check.toml") : chalk.red("missing check.toml");
  writeLine(`  ${project.path.padEnd(pathWidth)}${project.type.padEnd(typeWidth)}${statusIcon} ${statusText}`);
}

/** Output summary for missing projects */
function outputMissingSummary(missingCount: number): void {
  writeLine(
    `\n${missingCount} project(s) missing check.toml. ` + `Run ${chalk.cyan("cm projects detect --fix")} to create them.`
  );
}

/** Output detection results as text table */
function outputText(result: DetectionResult, options: DetectOptions): void {
  const { projects, workspaceRoots } = result;

  if (projects.length === 0) {
    writeLine(chalk.yellow("No projects detected."));
    return;
  }

  writeLine(`\nDetected ${projects.length} project(s):\n`);

  const pathWidth = Math.max(20, ...projects.map((p) => p.path.length)) + 2;
  const typeWidth = 14;

  outputTableHeader(pathWidth, typeWidth);

  for (const project of projects) {
    outputProjectRow(project, pathWidth, typeWidth);
  }

  const missingCount = projects.filter((p) => !p.hasCheckToml).length;
  if (missingCount > 0 && !options.fix && !options.dryRun) {
    outputMissingSummary(missingCount);
  }

  if (workspaceRoots.length > 0) {
    writeLine(chalk.dim(`\nSkipped ${workspaceRoots.length} workspace root(s).`));
  }
}

/** Output registry creation info */
function outputRegistryCreation(options: DetectOptions, registryPath: string, projectTypes: Set<string>, actions: FixAction[]): void {
  const actionWord = options.dryRun ? "Would create" : "Created";
  writeLine(`\n${chalk.cyan(actionWord)} registry at ${registryPath}/`);
  for (const type of projectTypes) {
    writeLine(chalk.dim(`  rulesets/${type}.toml`));
    actions.push({
      action: options.dryRun ? "would-create" : "created",
      path: path.join(registryPath, "rulesets", `${type}.toml`),
    });
  }
}

/** Get registry relative path from project directory */
function getRegistryRelativePath(options: DetectOptions, searchRoot: string, projectAbsPath: string): string | undefined {
  if (!options.registry) {
    return undefined;
  }
  const absoluteRegistryPath = path.resolve(searchRoot, options.registry);
  return path.relative(projectAbsPath, absoluteRegistryPath);
}

/** Process a single missing project for fix */
function processMissingProject(
  project: { path: string; type: ProjectType },
  options: DetectOptions,
  searchRoot: string,
  actions: FixAction[]
): void {
  const projectAbsPath = path.join(searchRoot, project.path);
  const registryRelativePath = getRegistryRelativePath(options, searchRoot, projectAbsPath);
  const created = createCheckToml(projectAbsPath, project.type, !!options.dryRun, registryRelativePath);

  if (!created) {
    return;
  }

  const checkTomlPath = path.join(project.path, "check.toml");
  actions.push({ action: options.dryRun ? "would-create" : "created", path: checkTomlPath });

  if (options.format === "text") {
    const actionWord = options.dryRun ? "Would create" : "Created";
    writeLine(`${chalk.green(actionWord)}: ${checkTomlPath}`);
  }
}

/** Create check.toml files for missing projects */
function createMissingCheckTomls(result: DetectionResult, options: DetectOptions, searchRoot: string, actions: FixAction[]): void {
  const missing = result.projects.filter((p) => !p.hasCheckToml);

  for (const project of missing) {
    processMissingProject(project, options, searchRoot, actions);
  }

  if (options.format === "text" && !options.dryRun && missing.length > 0) {
    writeLine(chalk.green(`\nCreated ${missing.length} check.toml file(s).`));
  }
}

/** Handle registry creation if --registry is specified */
function handleRegistryCreation(result: DetectionResult, options: DetectOptions, searchRoot: string, actions: FixAction[]): void {
  if (!options.registry) {
    return;
  }
  const projectTypes = getProjectTypes(result.projects);
  const absoluteRegistryPath = path.resolve(searchRoot, options.registry);
  createRegistry(absoluteRegistryPath, projectTypes, !!options.dryRun);

  if (options.format === "text") {
    outputRegistryCreation(options, options.registry, projectTypes as unknown as Set<string>, actions);
  }
}

/** Handle --fix and --dry-run flags */
function handleFix(result: DetectionResult, options: DetectOptions, searchRoot: string): FixAction[] {
  const missing = result.projects.filter((p) => !p.hasCheckToml);
  const actions: FixAction[] = [];

  if (missing.length === 0) {
    if (options.format === "text") {
      writeLine(chalk.green("\nAll projects have check.toml!"));
    }
    return actions;
  }

  handleRegistryCreation(result, options, searchRoot, actions);

  if (options.format === "text") {
    writeLine("");
  }

  createMissingCheckTomls(result, options, searchRoot, actions);
  return actions;
}

/** Main entry point for the detect command */
export async function runDetect(options: DetectOptions): Promise<void> {
  const searchRoot = process.cwd();
  const result = await detectProjects(searchRoot);

  // Handle --fix or --dry-run
  let actions: FixAction[] | undefined;
  if (options.fix || options.dryRun) {
    actions = handleFix(result, options, searchRoot);
  }

  // Output results
  if (options.format === "json") {
    outputJson(result, actions);
  } else {
    outputText(result, options);
  }
}

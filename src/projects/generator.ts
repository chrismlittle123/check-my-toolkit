/**
 * Config generation for projects
 *
 * Creates check.toml files with sensible defaults for each project type
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { DetectedProject, FixResult, ProjectType } from "./types.js";

/** Default check.toml content by project type */
const DEFAULT_CONFIGS: Record<ProjectType, string> = {
  typescript: `# check.toml - TypeScript project configuration

[code.linting.eslint]
enabled = true

[code.types.tsc]
enabled = true
`,
  python: `# check.toml - Python project configuration

[code.linting.ruff]
enabled = true
`,
};

/**
 * Generate extends configuration pointing to a registry
 */
function generateExtendsConfig(registryRelativePath: string, projectType: ProjectType): string {
  return `# check.toml - extends from shared registry

[extends]
registry = "${registryRelativePath}"
rulesets = ["${projectType}"]
`;
}

/**
 * Generate check.toml content for a project
 */
export function generateConfig(project: DetectedProject, registryPath?: string): string {
  if (registryPath) {
    const relativePath = path.relative(project.absolutePath, registryPath);
    return generateExtendsConfig(relativePath, project.type);
  }
  return DEFAULT_CONFIGS[project.type];
}

/**
 * Create a shared registry with rulesets for each project type
 */
export function createRegistry(registryPath: string, projectTypes: Set<ProjectType>): string[] {
  const rulesetsDir = path.join(registryPath, "rulesets");
  fs.mkdirSync(rulesetsDir, { recursive: true });

  const created: string[] = [];
  for (const projectType of projectTypes) {
    const rulesetPath = path.join(rulesetsDir, `${projectType}.toml`);
    fs.writeFileSync(rulesetPath, DEFAULT_CONFIGS[projectType]);
    created.push(`${projectType}.toml`);
  }

  return created;
}

/**
 * Create or simulate registry creation
 */
function setupRegistry(
  registryPath: string,
  projectTypes: Set<ProjectType>,
  dryRun: boolean
): string[] {
  if (dryRun) {
    return Array.from(projectTypes).map((t) => `${t}.toml`);
  }
  return createRegistry(registryPath, projectTypes);
}

/**
 * Create check.toml for a single project
 */
function createCheckToml(project: DetectedProject, registryPath: string | undefined, dryRun: boolean): void {
  if (dryRun) {return;}
  const configPath = path.join(project.absolutePath, "check.toml");
  fs.writeFileSync(configPath, generateConfig(project, registryPath));
}

/**
 * Fix projects by creating missing check.toml files
 */
export function fixProjects(
  projects: DetectedProject[],
  options: { registry?: string; dryRun?: boolean } = {}
): FixResult {
  const { registry, dryRun = false } = options;
  const projectsToFix = projects.filter((p) => p.configStatus === "missing");
  const skipped = projects.filter((p) => p.configStatus === "present");

  let registryPath: string | undefined;
  let rulesetsCreated: string[] | undefined;
  if (registry && projectsToFix.length > 0) {
    registryPath = path.resolve(registry);
    const projectTypes = new Set(projectsToFix.map((p) => p.type));
    rulesetsCreated = setupRegistry(registryPath, projectTypes, dryRun);
  }

  const created = projectsToFix.map((project) => {
    createCheckToml(project, registryPath, dryRun);
    return project;
  });

  return { created, skipped, registryPath, rulesetsCreated };
}

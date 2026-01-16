/**
 * Monorepo support - run checks across all detected projects
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { runCodeChecks } from "../code/index.js";
import { getProjectRoot, loadConfigAsync } from "../config/index.js";
import { runInfraChecks } from "../infra/index.js";
import { runProcessChecks } from "../process/index.js";
import { type DetectedProject,detectProjects } from "../projects/index.js";
import {
  type DomainResult,
  ExitCode,
  type FullResult,
  type MonorepoResult,
  type ProjectCheckResult,
} from "../types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, "..", "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as { version: string };
const VERSION = packageJson.version;

type DomainFilter = "code" | "process" | "infra" | undefined;

function shouldRunDomain(filter: DomainFilter, domain: "code" | "process" | "infra"): boolean {
  return !filter || filter === domain;
}

function buildResult(configPath: string, domains: Record<string, DomainResult>): FullResult {
  const totalViolations = Object.values(domains).reduce((sum, d) => sum + d.violationCount, 0);
  return {
    version: VERSION,
    configPath,
    domains,
    summary: {
      totalViolations,
      exitCode: totalViolations > 0 ? ExitCode.VIOLATIONS_FOUND : ExitCode.SUCCESS,
    },
  };
}

async function runProjectChecks(
  configPath: string,
  domain?: DomainFilter
): Promise<FullResult> {
  const { config } = await loadConfigAsync(configPath);
  const projectRoot = getProjectRoot(configPath);

  const domains: Record<string, DomainResult> = {};
  if (shouldRunDomain(domain, "code")) {
    domains.code = await runCodeChecks(projectRoot, config);
  }
  if (shouldRunDomain(domain, "process")) {
    domains.process = await runProcessChecks(projectRoot, config);
  }
  if (shouldRunDomain(domain, "infra")) {
    domains.infra = await runInfraChecks(projectRoot, config);
  }

  return buildResult(configPath, domains);
}

function buildMonorepoSummary(projects: ProjectCheckResult[]): MonorepoResult["summary"] {
  const counts = projects.reduce(
    (acc, p) => {
      if (p.error) {
        acc.errorProjects++;
      } else if (p.result === null) {
        acc.skippedProjects++;
      } else {
        acc.checkedProjects++;
        acc.totalViolations += p.result.summary.totalViolations;
        if (p.result.summary.exitCode === ExitCode.SUCCESS) {
          acc.passedProjects++;
        } else {
          acc.failedProjects++;
        }
      }
      return acc;
    },
    { checkedProjects: 0, skippedProjects: 0, errorProjects: 0, totalViolations: 0, passedProjects: 0, failedProjects: 0 }
  );

  const failedProjects = counts.failedProjects + counts.errorProjects;
  const exitCode = failedProjects > 0 || counts.totalViolations > 0 ? ExitCode.VIOLATIONS_FOUND : ExitCode.SUCCESS;

  return {
    totalProjects: projects.length,
    checkedProjects: counts.checkedProjects,
    skippedProjects: counts.skippedProjects,
    passedProjects: counts.passedProjects,
    failedProjects,
    totalViolations: counts.totalViolations,
    exitCode,
  };
}

export interface MonorepoCheckOptions {
  domain?: DomainFilter;
}

/**
 * Run checks across all detected projects in a monorepo
 */
export async function runMonorepoChecks(
  searchRoot: string,
  options: MonorepoCheckOptions = {}
): Promise<MonorepoResult> {
  const { projects } = await detectProjects(searchRoot);

  const results: ProjectCheckResult[] = [];

  for (const project of projects) {
    const absoluteProjectPath = path.join(searchRoot, project.path);

    if (!project.hasCheckToml) {
      results.push({
        projectPath: project.path,
        projectType: project.type,
        result: null,
      });
      continue;
    }

    try {
      const configPath = path.join(absoluteProjectPath, "check.toml");
      // eslint-disable-next-line no-await-in-loop
      const result = await runProjectChecks(configPath, options.domain);

      results.push({
        projectPath: project.path,
        projectType: project.type,
        result,
      });
    } catch (error) {
      results.push({
        projectPath: project.path,
        projectType: project.type,
        result: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    version: VERSION,
    monorepoRoot: searchRoot,
    projects: results,
    summary: buildMonorepoSummary(results),
  };
}

export { type DetectedProject };

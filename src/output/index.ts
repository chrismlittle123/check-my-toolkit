import chalk from "chalk";

import {
  type DomainResult,
  type DomainStatus,
  type FullResult,
  type MonorepoResult,
  type ProjectCheckResult,
  type Violation,
} from "../types/index.js";

export type OutputFormat = "text" | "json";

/** Icon mapping for domain/check status with colors */
const STATUS_ICONS: Record<DomainStatus, string> = {
  pass: chalk.green("✓"),
  fail: chalk.red("✗"),
  skip: chalk.gray("○"),
};

/**
 * Format output as JSON
 */
export function formatJson(result: FullResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format output as human-readable text
 */
export function formatText(result: FullResult): string {
  const lines: string[] = [];

  // Header
  lines.push(`check-my-toolkit v${result.version}`);
  lines.push(`Config: ${result.configPath}`);
  lines.push("");

  // Domain results
  for (const [domainName, domain] of Object.entries(result.domains)) {
    lines.push(formatDomainText(domainName, domain));
    lines.push("");
  }

  // Summary
  lines.push(chalk.dim("─".repeat(50)));
  if (result.summary.totalViolations === 0) {
    lines.push(chalk.green("✓ All checks passed"));
  } else {
    lines.push(chalk.red(`✗ ${result.summary.totalViolations} violation(s) found`));
  }

  return lines.join("\n");
}

function getStatusIcon(status: DomainStatus): string {
  return STATUS_ICONS[status];
}

function getCheckIcon(passed: boolean, skipped: boolean): string {
  if (passed) {
    return chalk.green("✓");
  }
  if (skipped) {
    return chalk.gray("○");
  }
  return chalk.red("✗");
}

function formatCheckLine(check: DomainResult["checks"][number]): string[] {
  const checkIcon = getCheckIcon(check.passed, check.skipped);
  const duration = check.duration ? chalk.dim(` (${check.duration}ms)`) : "";

  if (check.skipped) {
    return [`  ${checkIcon} ${chalk.bold(check.name)}: ${chalk.gray("skipped")} - ${chalk.gray(check.skipReason)}${duration}`];
  }
  if (check.passed) {
    return [`  ${checkIcon} ${chalk.bold(check.name)}: ${chalk.green("passed")}${duration}`];
  }

  const lines = [`  ${checkIcon} ${chalk.bold(check.name)}: ${chalk.red(`${check.violations.length} violation(s)`)}${duration}`];
  const violationsToShow = check.violations.slice(0, 10);
  lines.push(...violationsToShow.map(formatViolationText));
  if (check.violations.length > 10) {
    lines.push(chalk.dim(`      ... and ${check.violations.length - 10} more`));
  }
  return lines;
}

function formatDomainText(name: string, domain: DomainResult): string {
  const statusIcon = getStatusIcon(domain.status);
  const lines = [`${statusIcon} ${chalk.bold(name.toUpperCase())}`];
  for (const check of domain.checks) {
    lines.push(...formatCheckLine(check));
  }
  return lines.join("\n");
}

/**
 * Format a single violation as text
 */
function formatLocation(file: string, line?: number, column?: number): string {
  if (line !== undefined && column !== undefined) {
    return `${file}:${line}:${column}`;
  }
  if (line !== undefined) {
    return `${file}:${line}`;
  }
  return file;
}

function formatViolationText(v: Violation): string {
  const location = v.file ? chalk.cyan(formatLocation(v.file, v.line, v.column)) : "";
  const code = v.code ? chalk.dim(`[${v.code}]`) : "";
  const severity = v.severity === "error" ? chalk.red("error") : chalk.yellow("warn");

  if (location) {
    return `      ${location} ${severity} ${code} ${v.message}`;
  }
  return `      ${severity} ${code} ${v.message}`;
}

/**
 * Format result based on output format
 */
export function formatOutput(result: FullResult, format: OutputFormat): string {
  switch (format) {
    case "json":
      return formatJson(result);
    case "text":
    default:
      return formatText(result);
  }
}

// =============================================================================
// Monorepo Output Formatters
// =============================================================================

function getProjectStatusIcon(project: ProjectCheckResult): string {
  if (project.error) {
    return chalk.red("✗");
  }
  if (project.result === null) {
    return chalk.yellow("○");
  }
  return project.result.summary.exitCode === 0 ? chalk.green("✓") : chalk.red("✗");
}

function getProjectStatusText(project: ProjectCheckResult): string {
  if (project.error) {
    return chalk.red("ERROR");
  }
  if (project.result === null) {
    return chalk.yellow("SKIP");
  }
  return project.result.summary.exitCode === 0 ? chalk.green("PASS") : chalk.red("FAIL");
}

function formatProjectLine(project: ProjectCheckResult): string[] {
  const icon = getProjectStatusIcon(project);
  const status = getProjectStatusText(project);
  const projectType = chalk.dim(`[${project.projectType}]`);
  const lines: string[] = [];

  lines.push(`${icon} ${status} ${project.projectPath} ${projectType}`);

  if (project.error) {
    lines.push(chalk.red(`    Error: ${project.error}`));
  } else if (project.result && project.result.summary.totalViolations > 0) {
    // Show violation count per domain
    for (const [domainName, domainResult] of Object.entries(project.result.domains)) {
      if (domainResult.violationCount > 0) {
        lines.push(chalk.dim(`    ${domainName}: ${domainResult.violationCount} violation(s)`));
      }
    }
  }

  return lines;
}

/**
 * Format monorepo result as JSON
 */
export function formatMonorepoJson(result: MonorepoResult): string {
  return JSON.stringify(result, null, 2);
}

function formatMonorepoHeader(result: MonorepoResult): string[] {
  return [
    `check-my-toolkit v${result.version} ${chalk.cyan("(monorepo mode)")}`,
    `Root: ${result.monorepoRoot}`,
    "",
  ];
}

function formatMonorepoSummary(summary: MonorepoResult["summary"]): string[] {
  const lines: string[] = ["", chalk.dim("─".repeat(50))];
  const projectStats = `${summary.passedProjects}/${summary.checkedProjects} projects passed`;
  const skippedInfo = summary.skippedProjects > 0 ? `, ${summary.skippedProjects} skipped` : "";

  if (summary.totalViolations === 0 && summary.failedProjects === 0) {
    lines.push(chalk.green(`✓ ${projectStats}${skippedInfo}`));
  } else {
    lines.push(chalk.red(`✗ ${projectStats}${skippedInfo}`));
    lines.push(chalk.red(`  ${summary.totalViolations} total violation(s)`));
  }
  return lines;
}

/**
 * Format monorepo result as human-readable text
 */
export function formatMonorepoText(result: MonorepoResult): string {
  const lines = formatMonorepoHeader(result);

  if (result.projects.length === 0) {
    lines.push(chalk.yellow("No projects detected"));
    return lines.join("\n");
  }

  for (const project of result.projects) {
    lines.push(...formatProjectLine(project));
  }

  lines.push(...formatMonorepoSummary(result.summary));
  return lines.join("\n");
}

/**
 * Format monorepo result based on output format
 */
export function formatMonorepoOutput(result: MonorepoResult, format: OutputFormat): string {
  switch (format) {
    case "json":
      return formatMonorepoJson(result);
    case "text":
    default:
      return formatMonorepoText(result);
  }
}

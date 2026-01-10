import chalk from "chalk";

import type { DetectionResult, FixResult } from "../projects/types.js";
import {
  type DomainResult,
  type DomainStatus,
  type FullResult,
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
// Project Detection Formatters
// =============================================================================

function formatProjectLine(project: DetectionResult["projects"][number], maxPathLen: number, maxTypeLen: number): string {
  const status =
    project.configStatus === "present"
      ? chalk.green("✓ has check.toml")
      : chalk.red("✗ missing check.toml");
  return `  ${project.path.padEnd(maxPathLen)}  ${project.type.padEnd(maxTypeLen)}  ${status}`;
}

function formatProjectsTable(projects: DetectionResult["projects"]): string[] {
  const maxPathLen = Math.max(...projects.map((p) => p.path.length), 4);
  const maxTypeLen = Math.max(...projects.map((p) => p.type.length), 4);
  return [
    `  ${"PATH".padEnd(maxPathLen)}  ${"TYPE".padEnd(maxTypeLen)}  STATUS`,
    ...projects.map((p) => formatProjectLine(p, maxPathLen, maxTypeLen)),
  ];
}

function formatWorkspaceRoots(roots: string[]): string[] {
  if (roots.length === 0) {return [];}
  return ["", chalk.dim("Workspace roots (skipped):"), ...roots.map((r) => chalk.dim(`  ${r}`))];
}

/**
 * Format project detection result as text
 */
export function formatDetectionText(result: DetectionResult): string {
  if (result.projects.length === 0) {return "No projects found.";}

  const lines = [
    `Detected ${result.projects.length} project(s):\n`,
    ...formatProjectsTable(result.projects),
    ...formatWorkspaceRoots(result.workspaceRoots),
  ];

  if (result.missingConfig > 0) {
    lines.push("", `${result.missingConfig} project(s) missing check.toml. Run ${chalk.cyan("cm projects detect --fix")} to create them.`);
  }

  return lines.join("\n");
}

/**
 * Format project detection result as JSON
 */
export function formatDetectionJson(result: DetectionResult): string {
  return JSON.stringify(result, null, 2);
}

function formatRegistrySection(result: FixResult, prefix: string): string[] {
  if (!result.registryPath || !result.rulesetsCreated?.length) {return [];}
  return [
    `${prefix} shared registry at ${chalk.cyan(result.registryPath)}:`,
    ...result.rulesetsCreated.map((r) => `  ${chalk.green("+")} rulesets/${r}`),
    "",
  ];
}

function formatCreatedFiles(created: FixResult["created"], prefix: string): string[] {
  return [
    `${prefix} check.toml files:`,
    ...created.map((p) => `  ${chalk.green("+")} ${p.path}/check.toml (${p.type})`),
  ];
}

/**
 * Format fix result as text
 */
export function formatFixText(result: FixResult, dryRun: boolean): string {
  const prefix = dryRun ? "Would create" : "Created";
  const registryLines = formatRegistrySection(result, prefix);

  if (result.created.length === 0) {
    return [...registryLines, "No check.toml files to create (all projects already have one)."].join("\n");
  }

  return [
    ...registryLines,
    ...formatCreatedFiles(result.created, prefix),
    "",
    `Done. ${result.created.length} file(s) ${dryRun ? "would be " : ""}created.`,
  ].join("\n");
}

/**
 * Format fix result as JSON
 */
export function formatFixJson(result: FixResult): string {
  return JSON.stringify(result, null, 2);
}

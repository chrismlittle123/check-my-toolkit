/**
 * Output formatters for infra scan results
 */

import chalk from "chalk";

import type { InfraScanResult, ResourceCheckResult } from "./types.js";

/**
 * Format scan result as text output
 */
function formatScanText(result: InfraScanResult): string {
  const lines: string[] = [];

  formatHeader(lines, result);
  formatResultsByStatus(lines, result.results);
  formatSummary(lines, result.summary);

  return lines.join("\n");
}

function formatHeader(lines: string[], result: InfraScanResult): void {
  lines.push(chalk.bold("Infrastructure Scan Results"));
  lines.push(`Manifest: ${result.manifest}`);
  if (result.project) {
    lines.push(`Project: ${result.project}`);
  }
  lines.push("");
}

function formatResultsByStatus(lines: string[], results: ResourceCheckResult[]): void {
  const found = results.filter((r) => r.exists && !r.error);
  const missing = results.filter((r) => !r.exists && !r.error);
  const errors = results.filter((r) => r.error);

  formatResultSection(lines, found, {
    colorFn: chalk.green.bold,
    label: "Found",
    formatLine: formatFoundLine,
  });
  formatResultSection(lines, missing, {
    colorFn: chalk.red.bold,
    label: "Missing",
    formatLine: formatMissingLine,
  });
  formatResultSection(lines, errors, {
    colorFn: chalk.yellow.bold,
    label: "Errors",
    formatLine: formatErrorLine,
  });
}

interface SectionConfig {
  colorFn: (s: string) => string;
  label: string;
  formatLine: (r: ResourceCheckResult) => string;
}

function formatResultSection(
  lines: string[],
  results: ResourceCheckResult[],
  config: SectionConfig
): void {
  if (results.length === 0) {
    return;
  }
  lines.push(config.colorFn(`${config.label} (${results.length}):`));
  for (const r of results) {
    lines.push(config.formatLine(r));
  }
  lines.push("");
}

function formatFoundLine(r: ResourceCheckResult): string {
  const icon = chalk.green("✓");
  const resourceInfo = `${r.service}/${r.resourceType}/${r.resourceId}`;
  return `  ${icon} ${resourceInfo}`;
}

function formatMissingLine(r: ResourceCheckResult): string {
  const icon = chalk.red("✗");
  const resourceInfo = `${r.service}/${r.resourceType}/${r.resourceId}`;
  return `  ${icon} ${resourceInfo}`;
}

function formatErrorLine(r: ResourceCheckResult): string {
  const icon = chalk.yellow("!");
  const resourceInfo = `${r.service}/${r.resourceType}/${r.resourceId}`;
  const errorText = r.error ?? "Unknown error";
  return `  ${icon} ${resourceInfo} - ${chalk.yellow(errorText)}`;
}

function formatSummary(
  lines: string[],
  summary: { total: number; found: number; missing: number; errors: number }
): void {
  lines.push(chalk.bold("Summary:"));
  lines.push(`  Total:   ${summary.total}`);
  lines.push(chalk.green(`  Found:   ${summary.found}`));
  lines.push(chalk.red(`  Missing: ${summary.missing}`));
  if (summary.errors > 0) {
    lines.push(chalk.yellow(`  Errors:  ${summary.errors}`));
  }
}

/**
 * Format scan result as JSON output
 */
function formatScanJson(result: InfraScanResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format scan result based on output format
 */
export function formatScan(result: InfraScanResult, format: "text" | "json"): string {
  return format === "json" ? formatScanJson(result) : formatScanText(result);
}

import {
  type DomainResult,
  type DomainStatus,
  type FullResult,
  type Violation,
} from "../types/index.js";

export type OutputFormat = "text" | "json";

/** Icon mapping for domain/check status */
const STATUS_ICONS: Record<DomainStatus, string> = {
  pass: "✓",
  fail: "✗",
  skip: "○",
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
  lines.push("─".repeat(50));
  if (result.summary.totalViolations === 0) {
    lines.push("✓ All checks passed");
  } else {
    lines.push(`✗ ${result.summary.totalViolations} violation(s) found`);
  }

  return lines.join("\n");
}

function getStatusIcon(status: DomainStatus): string {
  return STATUS_ICONS[status];
}

function getCheckIcon(passed: boolean, skipped: boolean): string {
  if (passed) return "✓";
  if (skipped) return "○";
  return "✗";
}

function formatCheckLine(check: DomainResult["checks"][number]): string[] {
  const checkIcon = getCheckIcon(check.passed, check.skipped);
  const duration = check.duration ? ` (${check.duration}ms)` : "";

  if (check.skipped) {
    return [`  ${checkIcon} ${check.name}: skipped - ${check.skipReason}${duration}`];
  }
  if (check.passed) {
    return [`  ${checkIcon} ${check.name}: passed${duration}`];
  }

  const lines = [`  ${checkIcon} ${check.name}: ${check.violations.length} violation(s)${duration}`];
  const violationsToShow = check.violations.slice(0, 10);
  lines.push(...violationsToShow.map(formatViolationText));
  if (check.violations.length > 10) {
    lines.push(`      ... and ${check.violations.length - 10} more`);
  }
  return lines;
}

function formatDomainText(name: string, domain: DomainResult): string {
  const statusIcon = getStatusIcon(domain.status);
  const lines = [`${statusIcon} ${name.toUpperCase()}`];
  for (const check of domain.checks) {
    lines.push(...formatCheckLine(check));
  }
  return lines.join("\n");
}

/**
 * Format a single violation as text
 */
function formatViolationText(v: Violation): string {
  const location = v.file ? `${v.file}:${v.line ?? 0}:${v.column ?? 0}` : "";
  const code = v.code ? `[${v.code}]` : "";
  const severity = v.severity === "error" ? "error" : "warn";

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

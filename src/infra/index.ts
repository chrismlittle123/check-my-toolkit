/**
 * Infra scan module - Public API
 *
 * Provides functionality to verify AWS resources declared in a manifest actually exist.
 */

import * as path from "node:path";

import chalk from "chalk";

import { getProjectRoot, loadConfigAsync } from "../config/index.js";
import { ExitCode } from "../types/index.js";

import { ManifestError, readManifest } from "./manifest.js";
import { formatScan } from "./output.js";
import { scanManifest } from "./scan.js";
import type { InfraScanResult, RunInfraScanOptions, ScanInfraOptions } from "./types.js";

// Re-export types
export type { InfraScanResult, ResourceCheckResult, ScanInfraOptions } from "./types.js";
export { ManifestError } from "./manifest.js";
export { parseArn, isValidArn } from "./arn.js";
export { SUPPORTED_SERVICES, isSupportedService } from "./checkers/index.js";

/**
 * Scan infrastructure resources declared in a manifest.
 *
 * This is the programmatic API for drift-toolkit integration.
 *
 * @param options - Options for the scan
 * @returns Scan result with all resource check results and summary
 *
 * @example
 * ```typescript
 * import { scanInfra } from "check-my-toolkit";
 *
 * const result = await scanInfra({ manifestPath: "./infra-manifest.json" });
 * console.log(result.summary);
 * // { total: 5, found: 4, missing: 1, errors: 0 }
 * ```
 */
export async function scanInfra(options: ScanInfraOptions = {}): Promise<InfraScanResult> {
  const resolvedManifestPath = await resolveManifestPath(options);
  const manifest = readManifest(resolvedManifestPath);
  return scanManifest(manifest, resolvedManifestPath);
}

async function resolveManifestPath(options: ScanInfraOptions): Promise<string> {
  const { manifestPath, configPath } = options;

  if (manifestPath) {
    return path.isAbsolute(manifestPath)
      ? manifestPath
      : path.resolve(process.cwd(), manifestPath);
  }

  const { config, configPath: loadedConfigPath } = await loadConfigAsync(configPath);
  const projectRoot = getProjectRoot(loadedConfigPath);

  const infraConfig = config.infra;
  if (!infraConfig?.enabled) {
    throw new ManifestError("Infra scanning is not enabled in check.toml");
  }

  const manifestName = infraConfig.manifest;
  return path.resolve(projectRoot, manifestName);
}

/**
 * Run infra scan from CLI
 */
export async function runInfraScan(options: RunInfraScanOptions = {}): Promise<void> {
  const { format = "text", manifestPath, configPath } = options;

  try {
    const result = await scanInfra({ manifestPath, configPath });
    outputResult(result, format);
  } catch (error) {
    handleError(error, format);
  }
}

function outputResult(result: InfraScanResult, format: "text" | "json"): never {
  process.stdout.write(`${formatScan(result, format)}\n`);

  if (result.summary.errors > 0) {
    process.exit(ExitCode.RUNTIME_ERROR);
  } else if (result.summary.missing > 0) {
    process.exit(ExitCode.VIOLATIONS_FOUND);
  } else {
    process.exit(ExitCode.SUCCESS);
  }
}

function handleError(error: unknown, format: "text" | "json"): never {
  const message = error instanceof Error ? error.message : "Unknown error";
  const isConfigError = error instanceof ManifestError;

  if (format === "json") {
    process.stdout.write(`${JSON.stringify({ error: message }, null, 2)}\n`);
  } else {
    console.error(chalk.red(`Error: ${message}`));
  }

  process.exit(isConfigError ? ExitCode.CONFIG_ERROR : ExitCode.RUNTIME_ERROR);
}

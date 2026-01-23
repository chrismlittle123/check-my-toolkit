/**
 * Scan logic for infra scan
 *
 * Orchestrates checking all resources in a manifest
 */

import { parseArn } from "./arn.js";
import { getChecker, isSupportedService, SUPPORTED_SERVICES } from "./checkers/index.js";
import type { InfraScanResult, InfraScanSummary, Manifest, ResourceCheckResult } from "./types.js";

/**
 * Default concurrency for parallel checks
 */
const DEFAULT_CONCURRENCY = 10;

/**
 * Scan all resources in a manifest
 *
 * @param manifest - The manifest containing resources to check
 * @param manifestPath - Path to the manifest file (for result metadata)
 * @param concurrency - Max number of parallel checks (default: 10)
 * @returns Scan result with all resource check results and summary
 */
export async function scanManifest(
  manifest: Manifest,
  manifestPath: string,
  concurrency: number = DEFAULT_CONCURRENCY
): Promise<InfraScanResult> {
  const { resources, project } = manifest;

  // Check all resources with controlled concurrency
  const results = await checkResourcesWithConcurrency(resources, concurrency);

  // Calculate summary
  const summary = calculateSummary(results);

  return {
    manifest: manifestPath,
    project,
    results,
    summary,
  };
}

/**
 * Check resources with controlled concurrency using a simple batching approach
 */
async function checkResourcesWithConcurrency(
  arns: string[],
  concurrency: number
): Promise<ResourceCheckResult[]> {
  const results: ResourceCheckResult[] = [];

  // Process in batches
  for (let i = 0; i < arns.length; i += concurrency) {
    const batch = arns.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((arn) => checkResource(arn)));
    results.push(...batchResults);
  }

  // Sort results to maintain consistent order (by ARN)
  results.sort((a, b) => a.arn.localeCompare(b.arn));

  return results;
}

/**
 * Check a single resource
 */
async function checkResource(arn: string): Promise<ResourceCheckResult> {
  // Parse the ARN
  const parsed = parseArn(arn);
  if (!parsed) {
    return {
      arn,
      exists: false,
      error: "Invalid ARN format",
      service: "unknown",
      resourceType: "unknown",
      resourceId: arn,
    };
  }

  // Check if the service is supported
  if (!isSupportedService(parsed.service)) {
    return {
      arn,
      exists: false,
      error: `Unsupported service: ${parsed.service}. Supported: ${SUPPORTED_SERVICES.join(", ")}`,
      service: parsed.service,
      resourceType: parsed.resourceType,
      resourceId: parsed.resourceId,
    };
  }

  // Get the checker for this service
  const checker = await getChecker(parsed.service);
  if (!checker) {
    return {
      arn,
      exists: false,
      error: `No checker available for service: ${parsed.service}`,
      service: parsed.service,
      resourceType: parsed.resourceType,
      resourceId: parsed.resourceId,
    };
  }

  // Check the resource
  return checker.check(parsed);
}

/**
 * Calculate summary statistics from check results
 */
function calculateSummary(results: ResourceCheckResult[]): InfraScanSummary {
  let found = 0;
  let missing = 0;
  let errors = 0;

  for (const result of results) {
    if (result.error) {
      errors++;
    } else if (result.exists) {
      found++;
    } else {
      missing++;
    }
  }

  return {
    total: results.length,
    found,
    missing,
    errors,
  };
}

/**
 * Scan logic for infra scan
 *
 * Orchestrates checking all resources in a manifest (AWS and GCP)
 */

import { isValidArn, parseArn } from "./arn.js";
import { getChecker, isSupportedService, SUPPORTED_SERVICES } from "./checkers/index.js";
import {
  getGcpChecker,
  isSupportedGcpService,
  SUPPORTED_GCP_SERVICES,
} from "./checkers/gcp/index.js";
import { isValidGcpResource, parseGcpResource } from "./gcp.js";
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
 * Check a single resource (AWS or GCP)
 */
async function checkResource(resource: string): Promise<ResourceCheckResult> {
  // Detect cloud provider and route to appropriate checker
  if (isValidArn(resource)) {
    return checkAwsResource(resource);
  }
  if (isValidGcpResource(resource)) {
    return checkGcpResource(resource);
  }

  return {
    arn: resource,
    exists: false,
    error: "Invalid resource format (not a valid AWS ARN or GCP resource path)",
    service: "unknown",
    resourceType: "unknown",
    resourceId: resource,
  };
}

/**
 * Check an AWS resource
 */
async function checkAwsResource(arn: string): Promise<ResourceCheckResult> {
  const parsed = parseArn(arn);
  if (!parsed) {
    return errorResult({ arn, error: "Invalid ARN format" });
  }

  if (!isSupportedService(parsed.service)) {
    const msg = `Unsupported AWS service: ${parsed.service}. Supported: ${SUPPORTED_SERVICES.join(", ")}`;
    return errorResult({
      arn,
      error: msg,
      service: parsed.service,
      resourceType: parsed.resourceType,
      resourceId: parsed.resourceId,
    });
  }

  const checker = await getChecker(parsed.service);
  if (!checker) {
    return errorResult({ arn, error: `No checker for AWS service: ${parsed.service}`, service: parsed.service });
  }

  return checker.check(parsed);
}

/**
 * Check a GCP resource
 */
async function checkGcpResource(resource: string): Promise<ResourceCheckResult> {
  const parsed = parseGcpResource(resource);
  if (!parsed) {
    return errorResult({ arn: resource, error: "Invalid GCP resource path format" });
  }

  if (!isSupportedGcpService(parsed.service)) {
    const msg = `Unsupported GCP service: ${parsed.service}. Supported: ${SUPPORTED_GCP_SERVICES.join(", ")}`;
    return errorResult({
      arn: resource,
      error: msg,
      service: parsed.service,
      resourceType: parsed.resourceType,
      resourceId: parsed.resourceId,
    });
  }

  const checker = await getGcpChecker(parsed.service);
  if (!checker) {
    return errorResult({ arn: resource, error: `No checker for GCP service: ${parsed.service}`, service: parsed.service });
  }

  return checker.check(parsed);
}

interface ErrorResultParams {
  arn: string;
  error: string;
  service?: string;
  resourceType?: string;
  resourceId?: string;
}

/**
 * Create an error result
 */
function errorResult(params: ErrorResultParams): ResourceCheckResult {
  const { arn, error, service = "unknown", resourceType = "unknown", resourceId = arn } = params;
  return { arn, exists: false, error, service, resourceType, resourceId };
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

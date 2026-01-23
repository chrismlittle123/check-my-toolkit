/**
 * Type definitions for the infra scan module
 */

/**
 * Parsed ARN components
 */
export interface ParsedArn {
  partition: string; // "aws", "aws-cn", "aws-us-gov"
  service: string; // "s3", "lambda", "dynamodb", etc.
  region: string; // "us-east-1", "" for global services
  accountId: string; // AWS account ID or "" for global resources
  resourceType: string; // Resource type if present
  resourceId: string; // Resource identifier
  raw: string; // Original ARN string
}

/**
 * Result of checking a single resource
 */
export interface ResourceCheckResult {
  arn: string;
  exists: boolean;
  error?: string;
  service: string;
  resourceType: string;
  resourceId: string;
}

/**
 * JSON manifest format
 */
export interface Manifest {
  project?: string;
  resources: string[];
}

/**
 * Summary of scan results
 */
export interface InfraScanSummary {
  total: number;
  found: number;
  missing: number;
  errors: number;
}

/**
 * Full scan result
 */
export interface InfraScanResult {
  manifest: string;
  project?: string;
  results: ResourceCheckResult[];
  summary: InfraScanSummary;
}

/**
 * Options for programmatic API
 */
export interface ScanInfraOptions {
  manifestPath?: string;
  configPath?: string;
}

/**
 * Options for CLI handler
 */
export interface RunInfraScanOptions extends ScanInfraOptions {
  format?: "text" | "json";
}

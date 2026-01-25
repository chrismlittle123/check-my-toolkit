/**
 * Type definitions for the infra scan module
 */

/**
 * Parsed ARN components (AWS)
 */
export interface ParsedArn {
  cloud: "aws";
  partition: string; // "aws", "aws-cn", "aws-us-gov"
  service: string; // "s3", "lambda", "dynamodb", etc.
  region: string; // "us-east-1", "" for global services
  accountId: string; // AWS account ID or "" for global resources
  resourceType: string; // Resource type if present
  resourceId: string; // Resource identifier
  raw: string; // Original ARN string
}

/**
 * Parsed GCP resource path components
 */
export interface ParsedGcpResource {
  cloud: "gcp";
  project: string; // GCP project ID
  service: string; // "run", "iam", "secretmanager", "artifactregistry"
  location: string; // "us-central1", "global", etc.
  resourceType: string; // "services", "serviceAccounts", "secrets", "repositories"
  resourceId: string; // Resource name/ID
  raw: string; // Original resource path
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
 * Account identifier parsed from account key
 */
export interface AccountId {
  cloud: "aws" | "gcp";
  id: string; // AWS account ID or GCP project ID
}

/**
 * Account entry in multi-account manifest
 */
export interface ManifestAccount {
  alias?: string;
  resources: string[];
}

/**
 * Multi-account manifest format (v2)
 */
export interface MultiAccountManifest {
  version: 2;
  project?: string;
  accounts: Record<string, ManifestAccount>; // Key: "aws:123" or "gcp:proj"
}

/**
 * Legacy flat manifest format (v1)
 */
export interface LegacyManifest {
  version?: 1;
  project?: string;
  resources: string[];
}

/**
 * Union type for manifest (supports both v1 and v2)
 */
export type Manifest = MultiAccountManifest | LegacyManifest;

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
 * Per-account scan results
 */
export interface AccountScanResult {
  alias?: string;
  results: ResourceCheckResult[];
  summary: InfraScanSummary;
}

/**
 * Full scan result
 */
export interface InfraScanResult {
  manifest: string;
  project?: string;
  results: ResourceCheckResult[];
  summary: InfraScanSummary;
  /** Per-account results (only present for multi-account manifests) */
  accountResults?: Record<string, AccountScanResult>;
}

/**
 * Options for programmatic API
 */
export interface ScanInfraOptions {
  manifestPath?: string;
  configPath?: string;
  /** Filter to specific account (by alias or account key like "aws:123") */
  account?: string;
}

/**
 * Options for CLI handler
 */
export interface RunInfraScanOptions extends ScanInfraOptions {
  format?: "text" | "json";
}

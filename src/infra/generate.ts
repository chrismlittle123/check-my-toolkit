/**
 * Manifest generation from Pulumi stack exports
 *
 * Parses Pulumi stack export JSON and extracts resource ARNs/identifiers
 * to generate an infra-manifest.json file.
 */

import * as fs from "node:fs";
import * as readline from "node:readline";

import { isValidArn } from "./arn.js";
import { isValidGcpResource } from "./gcp.js";
import type { Manifest } from "./types.js";

/**
 * Pulumi stack export structure (minimal typing for what we need)
 */
interface PulumiResource {
  urn?: string;
  type?: string;
  outputs?: Record<string, unknown>;
}

interface PulumiDeployment {
  resources?: PulumiResource[];
}

interface PulumiStackExport {
  deployment?: PulumiDeployment;
}

/** Default manifest filename */
export const DEFAULT_MANIFEST_NAME = "infra-manifest.json";

/**
 * Options for manifest generation
 */
export interface GenerateManifestOptions {
  /** Project name (extracted from stack if not provided) */
  project?: string;
  /** Output file path (defaults to infra-manifest.json) */
  output?: string;
  /** If true, output to stdout instead of file */
  stdout?: boolean;
}

/**
 * Clean a resource identifier by stripping Pulumi internal suffixes
 *
 * Pulumi sometimes appends internal metadata to ARNs like:
 * arn:aws:secretsmanager:...:secret:name|terraform-20260123...
 *
 * The pipe and everything after it should be stripped.
 */
function cleanResourceIdentifier(value: string): string {
  const pipeIndex = value.indexOf("|");
  if (pipeIndex !== -1) {
    return value.substring(0, pipeIndex);
  }
  return value;
}

/**
 * Check if a value is a valid resource identifier (AWS ARN or GCP path)
 */
function isValidResource(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  // Clean the value before validating (strip Pulumi suffixes)
  const cleaned = cleanResourceIdentifier(value);
  return isValidArn(cleaned) || isValidGcpResource(cleaned);
}

/**
 * Extract ARNs and resource identifiers from Pulumi resource outputs
 */
function extractResourcesFromOutputs(outputs: Record<string, unknown>): string[] {
  const resources: string[] = [];

  // Common ARN/resource output field names
  const arnFields = [
    "arn",
    "id",
    "bucketArn",
    "functionArn",
    "secretArn",
    "roleArn",
    "clusterArn",
    "serviceArn",
    "tableArn",
    "topicArn",
    "queueArn",
    "logGroupArn",
    "policyArn",
    // GCP-specific
    "name",
    "selfLink",
  ];

  for (const field of arnFields) {
    const value = outputs[field];
    if (isValidResource(value)) {
      resources.push(cleanResourceIdentifier(value));
    }
  }

  // Also check for any other fields that look like ARNs or GCP resources
  for (const [key, value] of Object.entries(outputs)) {
    if (!arnFields.includes(key) && isValidResource(value)) {
      resources.push(cleanResourceIdentifier(value));
    }
  }

  return resources;
}

/**
 * Extract project name from Pulumi resource URNs
 *
 * URN format: urn:pulumi:stack::project::type::name
 */
function extractProjectName(resources: PulumiResource[]): string | undefined {
  for (const resource of resources) {
    if (resource.urn) {
      const parts = resource.urn.split("::");
      if (parts.length >= 2) {
        return parts[1]; // project is the second part
      }
    }
  }
  return undefined;
}

/**
 * Parse Pulumi stack export JSON and extract manifest
 */
export function parseStackExport(stackExport: unknown, project?: string): Manifest {
  if (!stackExport || typeof stackExport !== "object") {
    throw new Error("Invalid stack export: expected an object");
  }

  const typed = stackExport as PulumiStackExport;
  const deployment = typed.deployment;

  if (!deployment?.resources) {
    throw new Error("Invalid stack export: missing deployment.resources");
  }

  const resources: string[] = [];

  // Extract resources from each Pulumi resource's outputs
  for (const resource of deployment.resources) {
    if (resource.outputs) {
      const extracted = extractResourcesFromOutputs(resource.outputs);
      resources.push(...extracted);
    }
  }

  // Deduplicate resources
  const uniqueResources = [...new Set(resources)];

  // Determine project name
  const projectName = project || extractProjectName(deployment.resources) || "unknown";

  return {
    project: projectName,
    resources: uniqueResources,
  };
}

/**
 * Read all content from stdin
 */
async function readStdin(): Promise<string> {
  // Check if stdin is a TTY (interactive terminal)
  if (process.stdin.isTTY) {
    throw new Error("No input provided. Pipe Pulumi stack export: pulumi stack export | cm infra generate");
  }

  return new Promise((resolve, reject) => {
    let data = "";
    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false,
    });

    rl.on("line", (line) => {
      data += line + "\n";
    });

    rl.on("close", () => {
      resolve(data);
    });

    rl.on("error", reject);

    // Timeout after 5 seconds if no data
    setTimeout(() => {
      if (!data) {
        rl.close();
        reject(new Error("Timeout waiting for stdin. Pipe Pulumi stack export: pulumi stack export | cm infra generate"));
      }
    }, 5000);
  });
}

/**
 * Generate manifest from stdin (Pulumi stack export)
 */
export async function generateManifestFromStdin(options: GenerateManifestOptions = {}): Promise<Manifest> {
  const content = await readStdin();

  let stackExport: unknown;
  try {
    stackExport = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON input. Expected Pulumi stack export format.");
  }

  return parseStackExport(stackExport, options.project);
}

/**
 * Generate manifest from a file
 */
export function generateManifestFromFile(filePath: string, options: GenerateManifestOptions = {}): Manifest {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");

  let stackExport: unknown;
  try {
    stackExport = JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in file ${filePath}`);
  }

  return parseStackExport(stackExport, options.project);
}

/**
 * Write manifest to file or stdout
 *
 * @param manifest - The manifest to write
 * @param options - Output options (defaults to writing infra-manifest.json)
 */
export function writeManifest(manifest: Manifest, options: { output?: string; stdout?: boolean } = {}): void {
  const json = JSON.stringify(manifest, null, 2);

  if (options.stdout) {
    process.stdout.write(json + "\n");
  } else {
    const outputPath = options.output || DEFAULT_MANIFEST_NAME;
    fs.writeFileSync(outputPath, json + "\n", "utf-8");
  }
}

/**
 * Manifest reader for infra scan
 *
 * Supports two formats:
 * 1. JSON: { "project": "...", "resources": ["arn:..."] }
 * 2. TXT: One ARN per line, # for comments
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { isValidArn } from "./arn.js";
import type { Manifest } from "./types.js";

/**
 * Error thrown when manifest parsing fails
 */
export class ManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManifestError";
  }
}

/**
 * Read and parse a manifest file
 *
 * @param manifestPath - Path to the manifest file
 * @returns Parsed manifest with project name and resource ARNs
 */
export function readManifest(manifestPath: string): Manifest {
  if (!fs.existsSync(manifestPath)) {
    throw new ManifestError(`Manifest file not found: ${manifestPath}`);
  }

  const content = fs.readFileSync(manifestPath, "utf-8");
  const ext = path.extname(manifestPath).toLowerCase();

  if (ext === ".json") {
    return parseJsonManifest(content, manifestPath);
  }

  if (ext === ".txt") {
    return parseTxtManifest(content, manifestPath);
  }

  // Try JSON first, then TXT
  try {
    return parseJsonManifest(content, manifestPath);
  } catch {
    return parseTxtManifest(content, manifestPath);
  }
}

/**
 * Parse a JSON format manifest
 */
function parseJsonManifest(content: string, manifestPath: string): Manifest {
  const data = parseJsonContent(content, manifestPath);
  validateJsonStructure(data, manifestPath);

  const obj = data as Record<string, unknown>;
  const resources = extractAndValidateResources(obj.resources as unknown[], manifestPath);
  const project = typeof obj.project === "string" ? obj.project : undefined;

  return { project, resources };
}

function parseJsonContent(content: string, manifestPath: string): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new ManifestError(`Invalid JSON in manifest ${manifestPath}: ${message}`);
  }
}

function validateJsonStructure(data: unknown, manifestPath: string): void {
  if (!data || typeof data !== "object") {
    throw new ManifestError(`Manifest ${manifestPath} must be a JSON object`);
  }

  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.resources)) {
    throw new ManifestError(`Manifest ${manifestPath} must have a "resources" array`);
  }
}

function extractAndValidateResources(items: unknown[], manifestPath: string): string[] {
  const resources: string[] = [];
  const invalidArns: string[] = [];

  for (const item of items) {
    if (typeof item !== "string") {
      throw new ManifestError(
        `Manifest ${manifestPath} contains non-string resource: ${JSON.stringify(item)}`
      );
    }
    if (!isValidArn(item)) {
      invalidArns.push(item);
    } else {
      resources.push(item);
    }
  }

  if (invalidArns.length > 0) {
    throw new ManifestError(
      `Manifest ${manifestPath} contains invalid ARNs: ${invalidArns.join(", ")}`
    );
  }

  return resources;
}

/**
 * Parse a TXT format manifest (one ARN per line, # for comments)
 */
function parseTxtManifest(content: string, manifestPath: string): Manifest {
  const lines = content.split("\n");
  const resources: string[] = [];
  const invalidArns: { line: number; value: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith("#")) {
      continue;
    }

    if (!isValidArn(line)) {
      invalidArns.push({ line: i + 1, value: line });
    } else {
      resources.push(line);
    }
  }

  if (invalidArns.length > 0) {
    const details = invalidArns.map((a) => `line ${a.line}: "${a.value}"`).join(", ");
    throw new ManifestError(`Manifest ${manifestPath} contains invalid ARNs: ${details}`);
  }

  return { resources };
}

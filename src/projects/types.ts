/**
 * Types for project detection and initialization
 */

/** Supported project types based on marker files */
export type ProjectType = "typescript" | "python";

/** Project detection status */
export type ConfigStatus = "present" | "missing";

/** A detected project in the repository */
export interface DetectedProject {
  /** Relative path from scan root */
  path: string;
  /** Absolute path to project directory */
  absolutePath: string;
  /** Detected project type */
  type: ProjectType;
  /** Whether check.toml exists */
  configStatus: ConfigStatus;
  /** Marker file that identified this project */
  markerFile: string;
}

/** Result of project detection */
export interface DetectionResult {
  /** All detected projects */
  projects: DetectedProject[];
  /** Number of projects with check.toml */
  withConfig: number;
  /** Number of projects missing check.toml */
  missingConfig: number;
  /** Detected workspace roots (not counted as projects) */
  workspaceRoots: string[];
}

/** Result of fix operation */
export interface FixResult {
  /** Projects that had check.toml created */
  created: DetectedProject[];
  /** Projects that already had check.toml */
  skipped: DetectedProject[];
  /** Path to registry if created */
  registryPath?: string;
  /** Rulesets created in registry */
  rulesetsCreated?: string[];
}

/** Options for project detection */
export interface DetectOptions {
  /** Root directory to scan (defaults to cwd) */
  root?: string;
}

/** Options for fix operation */
export interface FixOptions extends DetectOptions {
  /** Create shared registry at this path */
  registry?: string;
  /** Show what would be created without creating */
  dryRun?: boolean;
}

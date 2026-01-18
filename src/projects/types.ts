/** Project types detected by marker files */
export type ProjectType = "typescript" | "python";

/** Project marker file configuration */
export interface ProjectMarker {
  file: string;
  type: ProjectType;
  /** Optional function to check if this marker indicates a workspace root */
  isWorkspaceRoot?: (content: string) => boolean;
}

/** A detected project in the monorepo */
export interface DetectedProject {
  /** Relative path from search root */
  path: string;
  /** Detected project type */
  type: ProjectType;
  /** Whether check.toml exists in this project */
  hasCheckToml: boolean;
  /** Which marker file triggered detection */
  markerFile: string;
}

/** Result of project detection */
export interface DetectionResult {
  /** All detected projects */
  projects: DetectedProject[];
  /** Paths that were identified as workspace roots (skipped) */
  workspaceRoots: string[];
}

/** Options for the detect command */
export interface DetectOptions {
  /** Create missing check.toml files */
  fix?: boolean;
  /** Show what would be created without creating */
  dryRun?: boolean;
  /** Create shared registry and extend from it */
  registry?: string;
  /** Output format */
  format: "text" | "json";
}

/** JSON output structure */
export interface DetectJsonOutput {
  projects: {
    path: string;
    type: string;
    status: "has-config" | "missing-config";
  }[];
  workspaceRoots: string[];
  summary: {
    total: number;
    withConfig: number;
    missingConfig: number;
  };
  actions?: {
    action: "created" | "would-create";
    path: string;
  }[];
}

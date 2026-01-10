/**
 * Project detection logic
 *
 * Scans a directory tree to find projects based on marker files
 * (package.json, pyproject.toml, Cargo.toml, go.mod)
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { ConfigStatus, DetectedProject, DetectionResult, ProjectType } from "./types.js";

/** Marker files that identify project types */
const PROJECT_MARKERS: Record<string, ProjectType> = {
  "package.json": "typescript",
  "pyproject.toml": "python",
};

/** Directories to skip during scanning */
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "venv",
  ".venv",
  "__pycache__",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  ".cache",
  ".turbo",
]);

/** Files that indicate a workspace root (not a project) */
const WORKSPACE_INDICATORS = ["turbo.json", "pnpm-workspace.yaml", "lerna.json", "nx.json"];

/**
 * Check if a package.json indicates a workspace root
 * (has "workspaces" field)
 */
function isWorkspacePackageJson(packageJsonPath: string): boolean {
  try {
    const content = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as Record<string, unknown>;
    return "workspaces" in content;
  } catch {
    return false;
  }
}

/**
 * Check if a directory is a workspace root
 */
function isWorkspaceRoot(dirPath: string): boolean {
  // Check for workspace indicator files
  for (const indicator of WORKSPACE_INDICATORS) {
    if (fs.existsSync(path.join(dirPath, indicator))) {
      return true;
    }
  }

  // Check if package.json has workspaces field
  const packageJsonPath = path.join(dirPath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    return isWorkspacePackageJson(packageJsonPath);
  }

  return false;
}

/**
 * Check if check.toml exists in a directory
 */
function hasCheckToml(dirPath: string): boolean {
  return fs.existsSync(path.join(dirPath, "check.toml"));
}

/**
 * Read directory entries, returning empty array on error
 */
function readDirSafe(dirPath: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * Check if entry should be skipped
 */
function shouldSkipEntry(entry: fs.Dirent): boolean {
  return !entry.isDirectory() || SKIP_DIRECTORIES.has(entry.name) || entry.name.startsWith(".");
}

/**
 * Find the first matching project marker in a directory
 */
function findProjectMarker(dirPath: string): { markerFile: string; projectType: ProjectType } | null {
  for (const [markerFile, projectType] of Object.entries(PROJECT_MARKERS)) {
    if (fs.existsSync(path.join(dirPath, markerFile))) {
      return { markerFile, projectType };
    }
  }
  return null;
}

/**
 * Recursively scan a directory for projects
 */
function scanDirectory(
  rootDir: string,
  currentDir: string,
  projects: DetectedProject[],
  workspaceRoots: string[]
): void {
  const entries = readDirSafe(currentDir);
  if (entries.length === 0) {return;}

  const marker = findProjectMarker(currentDir);
  if (marker) {
    const relativePath = path.relative(rootDir, currentDir) || ".";

    if (isWorkspaceRoot(currentDir)) {
      workspaceRoots.push(relativePath);
    } else {
      const configStatus: ConfigStatus = hasCheckToml(currentDir) ? "present" : "missing";
      projects.push({
        path: relativePath,
        absolutePath: currentDir,
        type: marker.projectType,
        configStatus,
        markerFile: marker.markerFile,
      });
      return;
    }
  }

  for (const entry of entries) {
    if (shouldSkipEntry(entry)) {continue;}
    scanDirectory(rootDir, path.join(currentDir, entry.name), projects, workspaceRoots);
  }
}

/**
 * Detect all projects in a directory tree
 */
export function detectProjects(rootDir: string = process.cwd()): DetectionResult {
  const absoluteRoot = path.resolve(rootDir);
  const projects: DetectedProject[] = [];
  const workspaceRoots: string[] = [];

  scanDirectory(absoluteRoot, absoluteRoot, projects, workspaceRoots);

  // Sort projects by path
  projects.sort((a, b) => a.path.localeCompare(b.path));

  const withConfig = projects.filter((p) => p.configStatus === "present").length;
  const missingConfig = projects.filter((p) => p.configStatus === "missing").length;

  return {
    projects,
    withConfig,
    missingConfig,
    workspaceRoots,
  };
}

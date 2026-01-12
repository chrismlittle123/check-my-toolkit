import * as fs from "node:fs";
import * as path from "node:path";

import { glob } from "glob";

import type { DetectedProject, DetectionResult, ProjectMarker, ProjectType } from "./types.js";

/** Marker files that identify project types */
const PROJECT_MARKERS: ProjectMarker[] = [
  {
    file: "package.json",
    type: "typescript",
    isWorkspaceRoot: (content): boolean => {
      try {
        const pkg = JSON.parse(content) as { workspaces?: unknown };
        return !!pkg.workspaces;
      } catch {
        return false;
      }
    },
  },
  { file: "pyproject.toml", type: "python" },
  { file: "Cargo.toml", type: "rust" },
  { file: "go.mod", type: "go" },
];

/** Files that indicate a workspace/monorepo root (not a project) */
const WORKSPACE_ROOT_MARKERS = ["turbo.json", "pnpm-workspace.yaml", "lerna.json"];

/** Directories to skip during detection */
const SKIP_DIRECTORIES = [
  "node_modules",
  ".git",
  "venv",
  ".venv",
  "__pycache__",
  "dist",
  "build",
  "target",
  "coverage",
  ".next",
  ".nuxt",
];

/** Check if a directory has workspace root markers */
function hasWorkspaceMarkers(dirPath: string): boolean {
  return WORKSPACE_ROOT_MARKERS.some((marker) => fs.existsSync(path.join(dirPath, marker)));
}

/** Check if check.toml exists in a directory */
function hasCheckToml(dirPath: string): boolean {
  return fs.existsSync(path.join(dirPath, "check.toml"));
}

/** Check if a marker indicates a workspace root */
function isMarkerWorkspaceRoot(marker: ProjectMarker, absoluteMarkerPath: string): boolean {
  if (!marker.isWorkspaceRoot) {
    return false;
  }
  try {
    const content = fs.readFileSync(absoluteMarkerPath, "utf-8");
    return marker.isWorkspaceRoot(content);
  } catch {
    return false;
  }
}

/** Context object for processing marker files */
interface ProcessingContext {
  searchRoot: string;
  seenPaths: Set<string>;
  projects: DetectedProject[];
  workspaceRoots: string[];
}

/** Add a workspace root to the context */
function addWorkspaceRoot(ctx: ProcessingContext, normalizedPath: string): void {
  ctx.workspaceRoots.push(normalizedPath);
  ctx.seenPaths.add(normalizedPath);
}

/** Add a project to the context */
function addProject(ctx: ProcessingContext, normalizedPath: string, marker: ProjectMarker, absoluteProjectDir: string): void {
  ctx.seenPaths.add(normalizedPath);
  ctx.projects.push({
    path: normalizedPath,
    type: marker.type,
    hasCheckToml: hasCheckToml(absoluteProjectDir),
    markerFile: marker.file,
  });
}

/** Process a single marker file and determine if it's a project or workspace root */
function processMarkerFile(ctx: ProcessingContext, markerFile: string, marker: ProjectMarker): void {
  const projectDir = path.dirname(markerFile);
  const normalizedPath = projectDir === "." ? "." : projectDir;

  if (ctx.seenPaths.has(normalizedPath)) {
    return;
  }

  const absoluteMarkerPath = path.join(ctx.searchRoot, markerFile);
  const absoluteProjectDir = path.join(ctx.searchRoot, projectDir);

  if (isMarkerWorkspaceRoot(marker, absoluteMarkerPath) || hasWorkspaceMarkers(absoluteProjectDir)) {
    addWorkspaceRoot(ctx, normalizedPath);
    return;
  }

  addProject(ctx, normalizedPath, marker, absoluteProjectDir);
}

/** Find all marker files for a project type */
async function findMarkerFiles(searchRoot: string, marker: ProjectMarker, ignorePatterns: string[]): Promise<string[]> {
  return glob(`**/${marker.file}`, {
    cwd: searchRoot,
    ignore: ignorePatterns,
    nodir: true,
  });
}

/**
 * Detect all projects in a directory tree.
 * Identifies projects by marker files and skips workspace roots.
 */
export async function detectProjects(searchRoot: string): Promise<DetectionResult> {
  const ctx: ProcessingContext = {
    searchRoot,
    seenPaths: new Set<string>(),
    projects: [],
    workspaceRoots: [],
  };

  const ignorePatterns = SKIP_DIRECTORIES.map((dir) => `**/${dir}/**`);

  // Find all marker files for each project type
  // Note: Sequential iteration is intentional to maintain priority order
  for (const marker of PROJECT_MARKERS) {
    // eslint-disable-next-line no-await-in-loop
    const markerFiles = await findMarkerFiles(searchRoot, marker, ignorePatterns);
    for (const markerFile of markerFiles) {
      processMarkerFile(ctx, markerFile, marker);
    }
  }

  // Sort for consistent output
  ctx.projects.sort((a, b) => a.path.localeCompare(b.path));
  ctx.workspaceRoots.sort((a, b) => a.localeCompare(b));

  return { projects: ctx.projects, workspaceRoots: ctx.workspaceRoots };
}

/** Get all project types that need templates */
export function getProjectTypes(projects: DetectedProject[]): Set<ProjectType> {
  return new Set(projects.filter((p) => !p.hasCheckToml).map((p) => p.type));
}

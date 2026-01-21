/**
 * Fetches the standards repository from GitHub
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { execa } from "execa";

const STANDARDS_OWNER = "palindrom-ai";
const STANDARDS_REPO = "standards";
const CACHE_DIR = path.join(os.tmpdir(), "cm-standards-cache");

/** Error class for standards fetching failures */
export class StandardsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StandardsError";
  }
}

/** Authentication method for GitHub */
type AuthMethod = "token" | "ssh" | "none";

/**
 * Detect authentication method based on environment variables.
 * Priority: CM_REGISTRY_TOKEN > GITHUB_TOKEN > SSH key detection > none
 */
function detectAuthMethod(): AuthMethod {
  if (process.env.CM_REGISTRY_TOKEN || process.env.GITHUB_TOKEN) {
    return "token";
  }
  if (process.env.SSH_AUTH_SOCK) {
    return "ssh";
  }
  return "none";
}

/**
 * Get the authentication token from environment variables.
 */
function getAuthToken(): string | undefined {
  return process.env.CM_REGISTRY_TOKEN ?? process.env.GITHUB_TOKEN;
}

/**
 * Build the git URL for the standards repository based on auth method.
 */
function buildGitHubUrl(auth: AuthMethod): string {
  switch (auth) {
    case "ssh":
      return `git@github.com:${STANDARDS_OWNER}/${STANDARDS_REPO}.git`;
    case "token": {
      const token = getAuthToken();
      if (token) {
        return `https://x-access-token:${token}@github.com/${STANDARDS_OWNER}/${STANDARDS_REPO}.git`;
      }
      return `https://github.com/${STANDARDS_OWNER}/${STANDARDS_REPO}.git`;
    }
    case "none":
    default:
      return `https://github.com/${STANDARDS_OWNER}/${STANDARDS_REPO}.git`;
  }
}

/**
 * Update an existing cloned repository.
 */
async function updateExistingRepo(repoDir: string): Promise<boolean> {
  try {
    await execa("git", ["pull", "--ff-only"], { cwd: repoDir, timeout: 30_000 });
    return true;
  } catch {
    // If update fails, remove the directory so it will be re-cloned
    fs.rmSync(repoDir, { recursive: true, force: true });
    return false;
  }
}

/**
 * Clone the standards repository.
 */
async function cloneRepo(repoDir: string): Promise<void> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const auth = detectAuthMethod();
  const url = buildGitHubUrl(auth);

  try {
    await execa("git", ["clone", "--depth", "1", url, repoDir], {
      timeout: 30_000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("timed out")) {
      throw new StandardsError(`Standards repo clone timed out after 30 seconds`);
    }
    throw new StandardsError(`Failed to clone standards repo: ${message}`);
  }
}

/**
 * Fetch the standards repository, caching it locally.
 * Returns the path to the cached repository.
 */
export async function fetchStandardsRepo(): Promise<string> {
  const repoDir = path.join(CACHE_DIR, `${STANDARDS_OWNER}-${STANDARDS_REPO}`);

  // If repo exists, try to update it
  if (fs.existsSync(repoDir)) {
    await updateExistingRepo(repoDir);
  }

  // Clone if it doesn't exist (either first time or after failed update)
  if (!fs.existsSync(repoDir)) {
    await cloneRepo(repoDir);
  }

  return repoDir;
}

/**
 * Get the path to the guidelines directory.
 */
export function getGuidelinesDir(repoPath: string): string {
  return path.join(repoPath, "guidelines");
}

/**
 * Get the path to the rulesets directory.
 */
export function getRulesetsDir(repoPath: string): string {
  return path.join(repoPath, "rulesets");
}

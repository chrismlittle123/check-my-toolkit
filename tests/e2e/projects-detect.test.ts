import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * E2E tests for `cm projects detect` command
 */

const FIXTURES_DIR = "tests/e2e/projects/detect";

function runProjectsDetect(
  cwd: string,
  args: string[] = [],
  format: "text" | "json" = "text"
): { stdout: string; exitCode: number } {
  const formatArg = format === "json" ? " -f json" : "";
  const extraArgs = args.length > 0 ? ` ${args.join(" ")}` : "";
  const cmd = `node ${process.cwd()}/dist/cli.js projects detect${formatArg}${extraArgs}`;

  try {
    const stdout = execSync(cmd, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout, exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };
    const stdout = (execError.stdout || "") + (execError.stderr || "");
    return { stdout, exitCode: execError.status ?? 1 };
  }
}

describe("cm projects detect", () => {
  describe("detection", () => {
    it("detects monorepo with multiple projects", () => {
      const { stdout, exitCode } = runProjectsDetect(path.join(FIXTURES_DIR, "monorepo"));

      expect(exitCode).toBe(0);
      expect(stdout).toContain("3 project(s)");
      expect(stdout).toContain("apps/web");
      expect(stdout).toContain("apps/api");
      expect(stdout).toContain("packages/shared");
      expect(stdout).toContain("typescript");
      expect(stdout).toContain("missing check.toml");
    });

    it("detects workspace root and skips it", () => {
      const { stdout, exitCode } = runProjectsDetect(path.join(FIXTURES_DIR, "monorepo"));

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Workspace roots");
    });

    it("detects single project with existing check.toml", () => {
      const { stdout, exitCode } = runProjectsDetect(path.join(FIXTURES_DIR, "single-project"));

      expect(exitCode).toBe(0);
      expect(stdout).toContain("1 project(s)");
      expect(stdout).toContain("has check.toml");
    });

    it("detects python project", () => {
      const { stdout, exitCode } = runProjectsDetect(path.join(FIXTURES_DIR, "python-project"));

      expect(exitCode).toBe(0);
      expect(stdout).toContain("1 project(s)");
      expect(stdout).toContain("python");
      expect(stdout).toContain("missing check.toml");
    });

    it("detects mixed TypeScript and Python projects", () => {
      const { stdout, exitCode } = runProjectsDetect(path.join(FIXTURES_DIR, "mixed-projects"));

      expect(exitCode).toBe(0);
      expect(stdout).toContain("2 project(s)");
      expect(stdout).toContain("frontend");
      expect(stdout).toContain("backend");
      expect(stdout).toContain("typescript");
      expect(stdout).toContain("python");
    });

    it("detects workspace with workspaces field in package.json", () => {
      const { stdout, exitCode } = runProjectsDetect(path.join(FIXTURES_DIR, "workspace-root"));

      expect(exitCode).toBe(0);
      expect(stdout).toContain("1 project(s)");
      expect(stdout).toContain("packages/lib");
      expect(stdout).toContain("Workspace roots");
    });
  });

  describe("JSON output", () => {
    it("outputs valid JSON for detection", () => {
      const { stdout, exitCode } = runProjectsDetect(path.join(FIXTURES_DIR, "monorepo"), [], "json");

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.projects).toHaveLength(3);
      expect(result.workspaceRoots).toContain(".");
      expect(result.withConfig).toBe(0);
      expect(result.missingConfig).toBe(3);
    });

    it("includes project details in JSON", () => {
      const { stdout, exitCode } = runProjectsDetect(path.join(FIXTURES_DIR, "single-project"), [], "json");

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.projects[0]).toEqual({
        path: ".",
        absolutePath: expect.stringContaining("single-project"),
        type: "typescript",
        configStatus: "present",
        markerFile: "package.json",
      });
    });
  });

  describe("--fix", () => {
    let tempDir: string;

    beforeEach(() => {
      // Create temp copy of python-project fixture
      tempDir = fs.mkdtempSync(path.join("tests/e2e/projects/detect", "temp-fix-"));
      fs.writeFileSync(path.join(tempDir, "pyproject.toml"), "[project]\nname = \"temp\"\nversion = \"1.0.0\"\n");
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("creates missing check.toml with --fix", () => {
      const { stdout, exitCode } = runProjectsDetect(tempDir, ["--fix"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Created check.toml");
      expect(fs.existsSync(path.join(tempDir, "check.toml"))).toBe(true);

      const content = fs.readFileSync(path.join(tempDir, "check.toml"), "utf-8");
      expect(content).toContain("[code.linting.ruff]");
    });

    it("does not create files with --dry-run", () => {
      const { stdout, exitCode } = runProjectsDetect(tempDir, ["--fix", "--dry-run"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Would create");
      expect(fs.existsSync(path.join(tempDir, "check.toml"))).toBe(false);
    });

    it("creates registry with --registry", () => {
      // Use relative path from cwd (which is tempDir when command runs)
      const { stdout, exitCode } = runProjectsDetect(tempDir, ["--fix", "--registry", ".cm"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("shared registry");
      expect(fs.existsSync(path.join(tempDir, ".cm", "rulesets", "python.toml"))).toBe(true);

      const checkToml = fs.readFileSync(path.join(tempDir, "check.toml"), "utf-8");
      expect(checkToml).toContain("[extends]");
      expect(checkToml).toContain('rulesets = ["python"]');
    });
  });

  describe("--fix with JSON output", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join("tests/e2e/projects/detect", "temp-fix-json-"));
      fs.writeFileSync(path.join(tempDir, "package.json"), '{"name": "temp"}\n');
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("outputs valid JSON for fix operation", () => {
      const { stdout, exitCode } = runProjectsDetect(tempDir, ["--fix"], "json");

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.created).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
    });
  });
});

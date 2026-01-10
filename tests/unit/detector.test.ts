import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { detectProjects } from "../../src/projects/detector.js";

describe("detectProjects", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-detect-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("single project detection", () => {
    it("detects TypeScript project with package.json", () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), "{}");

      const result = detectProjects(tempDir);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].type).toBe("typescript");
      expect(result.projects[0].markerFile).toBe("package.json");
      expect(result.projects[0].configStatus).toBe("missing");
    });

    it("detects Python project with pyproject.toml", () => {
      fs.writeFileSync(path.join(tempDir, "pyproject.toml"), "");

      const result = detectProjects(tempDir);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].type).toBe("python");
      expect(result.projects[0].markerFile).toBe("pyproject.toml");
    });

    it("detects existing check.toml", () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
      fs.writeFileSync(path.join(tempDir, "check.toml"), "");

      const result = detectProjects(tempDir);

      expect(result.projects[0].configStatus).toBe("present");
      expect(result.withConfig).toBe(1);
      expect(result.missingConfig).toBe(0);
    });

    it("detects missing check.toml", () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), "{}");

      const result = detectProjects(tempDir);

      expect(result.projects[0].configStatus).toBe("missing");
      expect(result.withConfig).toBe(0);
      expect(result.missingConfig).toBe(1);
    });
  });

  describe("nested project detection", () => {
    it("detects projects in subdirectories", () => {
      const projectA = path.join(tempDir, "apps", "web");
      const projectB = path.join(tempDir, "apps", "api");
      fs.mkdirSync(projectA, { recursive: true });
      fs.mkdirSync(projectB, { recursive: true });
      fs.writeFileSync(path.join(projectA, "package.json"), "{}");
      fs.writeFileSync(path.join(projectB, "package.json"), "{}");

      const result = detectProjects(tempDir);

      expect(result.projects).toHaveLength(2);
      expect(result.projects.map((p) => p.path).sort()).toEqual(["apps/api", "apps/web"]);
    });

    it("does not scan inside detected projects", () => {
      // Project at root
      fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
      // Nested directory with its own package.json (should not be detected as separate project)
      const nested = path.join(tempDir, "packages", "lib");
      fs.mkdirSync(nested, { recursive: true });
      fs.writeFileSync(path.join(nested, "package.json"), "{}");

      const result = detectProjects(tempDir);

      // Should only detect root project, not nested one
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].path).toBe(".");
    });
  });

  describe("workspace root detection", () => {
    it("detects package.json with workspaces as workspace root", () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }));
      const projectDir = path.join(tempDir, "packages", "lib");
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, "package.json"), "{}");

      const result = detectProjects(tempDir);

      expect(result.workspaceRoots).toContain(".");
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].path).toBe("packages/lib");
    });

    it("detects turbo.json as workspace root indicator", () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
      fs.writeFileSync(path.join(tempDir, "turbo.json"), "{}");
      const projectDir = path.join(tempDir, "apps", "web");
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, "package.json"), "{}");

      const result = detectProjects(tempDir);

      expect(result.workspaceRoots).toContain(".");
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].path).toBe("apps/web");
    });

    it("detects pnpm-workspace.yaml as workspace root indicator", () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
      fs.writeFileSync(path.join(tempDir, "pnpm-workspace.yaml"), "");
      const projectDir = path.join(tempDir, "packages", "core");
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, "package.json"), "{}");

      const result = detectProjects(tempDir);

      expect(result.workspaceRoots).toContain(".");
    });
  });

  describe("directory skipping", () => {
    it("skips node_modules", () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
      const nodeModules = path.join(tempDir, "node_modules", "some-package");
      fs.mkdirSync(nodeModules, { recursive: true });
      fs.writeFileSync(path.join(nodeModules, "package.json"), "{}");

      const result = detectProjects(tempDir);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].path).toBe(".");
    });

    it("skips .git directory", () => {
      const gitDir = path.join(tempDir, ".git");
      fs.mkdirSync(gitDir, { recursive: true });
      fs.writeFileSync(path.join(gitDir, "package.json"), "{}");

      const result = detectProjects(tempDir);

      expect(result.projects).toHaveLength(0);
    });

    it("skips venv directory", () => {
      fs.writeFileSync(path.join(tempDir, "pyproject.toml"), "");
      const venv = path.join(tempDir, "venv");
      fs.mkdirSync(venv, { recursive: true });
      fs.writeFileSync(path.join(venv, "pyproject.toml"), "");

      const result = detectProjects(tempDir);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].path).toBe(".");
    });

    it("skips hidden directories", () => {
      const hidden = path.join(tempDir, ".hidden");
      fs.mkdirSync(hidden, { recursive: true });
      fs.writeFileSync(path.join(hidden, "package.json"), "{}");

      const result = detectProjects(tempDir);

      expect(result.projects).toHaveLength(0);
    });
  });

  describe("mixed project types", () => {
    it("detects both TypeScript and Python projects", () => {
      const frontend = path.join(tempDir, "frontend");
      const backend = path.join(tempDir, "backend");
      fs.mkdirSync(frontend, { recursive: true });
      fs.mkdirSync(backend, { recursive: true });
      fs.writeFileSync(path.join(frontend, "package.json"), "{}");
      fs.writeFileSync(path.join(backend, "pyproject.toml"), "");

      const result = detectProjects(tempDir);

      expect(result.projects).toHaveLength(2);
      const types = result.projects.map((p) => p.type).sort();
      expect(types).toEqual(["python", "typescript"]);
    });
  });

  describe("edge cases", () => {
    it("returns empty result for empty directory", () => {
      const result = detectProjects(tempDir);

      expect(result.projects).toHaveLength(0);
      expect(result.withConfig).toBe(0);
      expect(result.missingConfig).toBe(0);
      expect(result.workspaceRoots).toHaveLength(0);
    });

    it("handles directory that does not exist", () => {
      const nonExistent = path.join(tempDir, "does-not-exist");

      const result = detectProjects(nonExistent);

      expect(result.projects).toHaveLength(0);
    });

    it("uses cwd when no root specified", () => {
      // This test just verifies the function can be called without arguments
      const result = detectProjects();

      // Should not throw and return a valid result
      expect(result).toHaveProperty("projects");
      expect(result).toHaveProperty("withConfig");
      expect(result).toHaveProperty("missingConfig");
    });
  });
});

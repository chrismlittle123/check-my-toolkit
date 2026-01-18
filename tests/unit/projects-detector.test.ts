import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { detectProjects, getProjectTypes } from "../../src/projects/detector.js";

describe("detectProjects", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-projects-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /** Helper to create a file with content */
  function createFile(relativePath: string, content: string): void {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  describe("project detection", () => {
    it("detects TypeScript projects by package.json", async () => {
      createFile("apps/web/package.json", JSON.stringify({ name: "web" }));

      const result = await detectProjects(tempDir);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].type).toBe("typescript");
      expect(result.projects[0].path).toBe("apps/web");
      expect(result.projects[0].markerFile).toBe("package.json");
    });

    it("detects Python projects by pyproject.toml", async () => {
      createFile("services/api/pyproject.toml", '[project]\nname = "api"');

      const result = await detectProjects(tempDir);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].type).toBe("python");
      expect(result.projects[0].path).toBe("services/api");
    });

    it("detects multiple projects of different types", async () => {
      createFile("apps/web/package.json", JSON.stringify({ name: "web" }));
      createFile("services/api/pyproject.toml", '[project]\nname = "api"');

      const result = await detectProjects(tempDir);

      expect(result.projects).toHaveLength(2);
      expect(result.projects.map((p) => p.type).sort()).toEqual(["python", "typescript"]);
    });

    it("returns empty array when no projects found", async () => {
      const result = await detectProjects(tempDir);

      expect(result.projects).toHaveLength(0);
    });
  });

  describe("check.toml detection", () => {
    it("correctly identifies projects with check.toml", async () => {
      createFile("app/package.json", JSON.stringify({ name: "app" }));
      createFile("app/check.toml", "[code]");

      const result = await detectProjects(tempDir);

      expect(result.projects[0].hasCheckToml).toBe(true);
    });

    it("correctly identifies projects without check.toml", async () => {
      createFile("app/package.json", JSON.stringify({ name: "app" }));

      const result = await detectProjects(tempDir);

      expect(result.projects[0].hasCheckToml).toBe(false);
    });
  });

  describe("workspace root detection", () => {
    it("skips package.json with workspaces field", async () => {
      createFile("package.json", JSON.stringify({ name: "monorepo", workspaces: ["packages/*"] }));
      createFile("packages/lib/package.json", JSON.stringify({ name: "lib" }));

      const result = await detectProjects(tempDir);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].path).toBe("packages/lib");
      expect(result.workspaceRoots).toContain(".");
    });

    it("skips directories with turbo.json", async () => {
      createFile("package.json", JSON.stringify({ name: "monorepo" }));
      createFile("turbo.json", "{}");

      const result = await detectProjects(tempDir);

      expect(result.projects).toHaveLength(0);
      expect(result.workspaceRoots).toContain(".");
    });

    it("skips directories with pnpm-workspace.yaml", async () => {
      createFile("package.json", JSON.stringify({ name: "monorepo" }));
      createFile("pnpm-workspace.yaml", "packages:\n  - packages/*");

      const result = await detectProjects(tempDir);

      expect(result.projects).toHaveLength(0);
      expect(result.workspaceRoots).toContain(".");
    });

    it("skips directories with lerna.json", async () => {
      createFile("package.json", JSON.stringify({ name: "monorepo" }));
      createFile("lerna.json", "{}");

      const result = await detectProjects(tempDir);

      expect(result.projects).toHaveLength(0);
      expect(result.workspaceRoots).toContain(".");
    });
  });

  describe("directory exclusion", () => {
    it("skips node_modules", async () => {
      createFile("node_modules/some-pkg/package.json", JSON.stringify({ name: "some-pkg" }));

      const result = await detectProjects(tempDir);

      expect(result.projects).toHaveLength(0);
    });

    it("skips dist directories", async () => {
      createFile("dist/package.json", JSON.stringify({ name: "dist" }));

      const result = await detectProjects(tempDir);

      expect(result.projects).toHaveLength(0);
    });

    it("skips __pycache__ directories", async () => {
      createFile("__pycache__/pyproject.toml", "[project]");

      const result = await detectProjects(tempDir);

      expect(result.projects).toHaveLength(0);
    });

    it("skips venv directories", async () => {
      createFile("venv/pyproject.toml", "[project]");
      createFile(".venv/pyproject.toml", "[project]");

      const result = await detectProjects(tempDir);

      expect(result.projects).toHaveLength(0);
    });
  });

  describe("sorting", () => {
    it("sorts projects by path alphabetically", async () => {
      createFile("z-project/package.json", JSON.stringify({ name: "z" }));
      createFile("a-project/package.json", JSON.stringify({ name: "a" }));
      createFile("m-project/package.json", JSON.stringify({ name: "m" }));

      const result = await detectProjects(tempDir);

      expect(result.projects.map((p) => p.path)).toEqual(["a-project", "m-project", "z-project"]);
    });
  });
});

describe("getProjectTypes", () => {
  it("returns unique project types for projects without check.toml", () => {
    const projects = [
      {
        path: "app1",
        type: "typescript" as const,
        hasCheckToml: false,
        markerFile: "package.json",
      },
      {
        path: "app2",
        type: "typescript" as const,
        hasCheckToml: false,
        markerFile: "package.json",
      },
      { path: "api", type: "python" as const, hasCheckToml: false, markerFile: "pyproject.toml" },
      { path: "lib", type: "typescript" as const, hasCheckToml: true, markerFile: "package.json" },
    ];

    const types = getProjectTypes(projects);

    expect(types.size).toBe(2);
    expect(types.has("typescript")).toBe(true);
    expect(types.has("python")).toBe(true);
  });

  it("returns empty set when all projects have check.toml", () => {
    const projects = [
      { path: "app", type: "typescript" as const, hasCheckToml: true, markerFile: "package.json" },
    ];

    const types = getProjectTypes(projects);

    expect(types.size).toBe(0);
  });
});

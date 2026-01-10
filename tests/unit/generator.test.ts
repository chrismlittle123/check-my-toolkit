import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { fixProjects, generateConfig } from "../../src/projects/generator.js";
import type { DetectedProject } from "../../src/projects/types.js";

describe("generateConfig", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-generator-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("default configs", () => {
    it("generates TypeScript config with ESLint and tsc", () => {
      const project: DetectedProject = {
        path: ".",
        absolutePath: tempDir,
        type: "typescript",
        configStatus: "missing",
        markerFile: "package.json",
      };

      const config = generateConfig(project);

      expect(config).toContain("[code.linting.eslint]");
      expect(config).toContain("enabled = true");
      expect(config).toContain("[code.types.tsc]");
    });

    it("generates Python config with Ruff", () => {
      const project: DetectedProject = {
        path: ".",
        absolutePath: tempDir,
        type: "python",
        configStatus: "missing",
        markerFile: "pyproject.toml",
      };

      const config = generateConfig(project);

      expect(config).toContain("[code.linting.ruff]");
      expect(config).toContain("enabled = true");
    });
  });

  describe("extends config", () => {
    it("generates extends config with relative registry path", () => {
      const projectDir = path.join(tempDir, "apps", "web");
      fs.mkdirSync(projectDir, { recursive: true });

      const project: DetectedProject = {
        path: "apps/web",
        absolutePath: projectDir,
        type: "typescript",
        configStatus: "missing",
        markerFile: "package.json",
      };

      const registryPath = path.join(tempDir, ".cm");
      const config = generateConfig(project, registryPath);

      expect(config).toContain("[extends]");
      expect(config).toContain('registry = "../../.cm"');
      expect(config).toContain('rulesets = ["typescript"]');
    });

    it("generates correct relative path for deeply nested project", () => {
      const projectDir = path.join(tempDir, "packages", "core", "lib");
      fs.mkdirSync(projectDir, { recursive: true });

      const project: DetectedProject = {
        path: "packages/core/lib",
        absolutePath: projectDir,
        type: "python",
        configStatus: "missing",
        markerFile: "pyproject.toml",
      };

      const registryPath = path.join(tempDir, ".cm");
      const config = generateConfig(project, registryPath);

      expect(config).toContain('registry = "../../../.cm"');
      expect(config).toContain('rulesets = ["python"]');
    });
  });
});

describe("fixProjects", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-fix-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("creating check.toml files", () => {
    it("creates check.toml for projects missing it", () => {
      const projectDir = path.join(tempDir, "app");
      fs.mkdirSync(projectDir, { recursive: true });

      const projects: DetectedProject[] = [
        {
          path: "app",
          absolutePath: projectDir,
          type: "typescript",
          configStatus: "missing",
          markerFile: "package.json",
        },
      ];

      const result = fixProjects(projects);

      expect(result.created).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
      expect(fs.existsSync(path.join(projectDir, "check.toml"))).toBe(true);
    });

    it("skips projects that already have check.toml", () => {
      const projectDir = path.join(tempDir, "app");
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, "check.toml"), "existing");

      const projects: DetectedProject[] = [
        {
          path: "app",
          absolutePath: projectDir,
          type: "typescript",
          configStatus: "present",
          markerFile: "package.json",
        },
      ];

      const result = fixProjects(projects);

      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
    });

    it("handles mixed projects", () => {
      const withConfig = path.join(tempDir, "with-config");
      const withoutConfig = path.join(tempDir, "without-config");
      fs.mkdirSync(withConfig, { recursive: true });
      fs.mkdirSync(withoutConfig, { recursive: true });
      fs.writeFileSync(path.join(withConfig, "check.toml"), "");

      const projects: DetectedProject[] = [
        {
          path: "with-config",
          absolutePath: withConfig,
          type: "typescript",
          configStatus: "present",
          markerFile: "package.json",
        },
        {
          path: "without-config",
          absolutePath: withoutConfig,
          type: "python",
          configStatus: "missing",
          markerFile: "pyproject.toml",
        },
      ];

      const result = fixProjects(projects);

      expect(result.created).toHaveLength(1);
      expect(result.skipped).toHaveLength(1);
      expect(result.created[0].path).toBe("without-config");
    });
  });

  describe("dry run mode", () => {
    it("does not create files in dry run mode", () => {
      const projectDir = path.join(tempDir, "app");
      fs.mkdirSync(projectDir, { recursive: true });

      const projects: DetectedProject[] = [
        {
          path: "app",
          absolutePath: projectDir,
          type: "typescript",
          configStatus: "missing",
          markerFile: "package.json",
        },
      ];

      const result = fixProjects(projects, { dryRun: true });

      expect(result.created).toHaveLength(1);
      expect(fs.existsSync(path.join(projectDir, "check.toml"))).toBe(false);
    });
  });

  describe("registry creation", () => {
    it("creates registry with rulesets", () => {
      const projectDir = path.join(tempDir, "app");
      const registryDir = path.join(tempDir, ".cm");
      fs.mkdirSync(projectDir, { recursive: true });

      const projects: DetectedProject[] = [
        {
          path: "app",
          absolutePath: projectDir,
          type: "typescript",
          configStatus: "missing",
          markerFile: "package.json",
        },
      ];

      const result = fixProjects(projects, { registry: registryDir });

      expect(result.registryPath).toBe(registryDir);
      expect(result.rulesetsCreated).toContain("typescript.toml");
      expect(fs.existsSync(path.join(registryDir, "rulesets", "typescript.toml"))).toBe(true);
    });

    it("creates rulesets for all project types", () => {
      const tsProject = path.join(tempDir, "ts-app");
      const pyProject = path.join(tempDir, "py-app");
      const registryDir = path.join(tempDir, ".cm");
      fs.mkdirSync(tsProject, { recursive: true });
      fs.mkdirSync(pyProject, { recursive: true });

      const projects: DetectedProject[] = [
        {
          path: "ts-app",
          absolutePath: tsProject,
          type: "typescript",
          configStatus: "missing",
          markerFile: "package.json",
        },
        {
          path: "py-app",
          absolutePath: pyProject,
          type: "python",
          configStatus: "missing",
          markerFile: "pyproject.toml",
        },
      ];

      const result = fixProjects(projects, { registry: registryDir });

      expect(result.rulesetsCreated).toContain("typescript.toml");
      expect(result.rulesetsCreated).toContain("python.toml");
    });

    it("does not create registry in dry run mode", () => {
      const projectDir = path.join(tempDir, "app");
      const registryDir = path.join(tempDir, ".cm");
      fs.mkdirSync(projectDir, { recursive: true });

      const projects: DetectedProject[] = [
        {
          path: "app",
          absolutePath: projectDir,
          type: "typescript",
          configStatus: "missing",
          markerFile: "package.json",
        },
      ];

      const result = fixProjects(projects, { registry: registryDir, dryRun: true });

      expect(result.registryPath).toBe(registryDir);
      expect(result.rulesetsCreated).toContain("typescript.toml");
      expect(fs.existsSync(registryDir)).toBe(false);
    });

    it("creates check.toml with extends when registry specified", () => {
      const projectDir = path.join(tempDir, "app");
      const registryDir = path.join(tempDir, ".cm");
      fs.mkdirSync(projectDir, { recursive: true });

      const projects: DetectedProject[] = [
        {
          path: "app",
          absolutePath: projectDir,
          type: "typescript",
          configStatus: "missing",
          markerFile: "package.json",
        },
      ];

      fixProjects(projects, { registry: registryDir });

      const configContent = fs.readFileSync(path.join(projectDir, "check.toml"), "utf-8");
      expect(configContent).toContain("[extends]");
      expect(configContent).toContain('rulesets = ["typescript"]');
    });
  });

  describe("edge cases", () => {
    it("handles empty projects array", () => {
      const result = fixProjects([]);

      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it("handles all projects already having config", () => {
      const projectDir = path.join(tempDir, "app");
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, "check.toml"), "");

      const projects: DetectedProject[] = [
        {
          path: "app",
          absolutePath: projectDir,
          type: "typescript",
          configStatus: "present",
          markerFile: "package.json",
        },
      ];

      const result = fixProjects(projects);

      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
    });
  });
});

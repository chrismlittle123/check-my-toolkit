import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDependencies } from "../../src/dependencies/index.js";
import { ALWAYS_TRACKED, BUILTIN_MAPPINGS } from "../../src/dependencies/mappings.js";
import { formatDependenciesJson, formatDependenciesText } from "../../src/dependencies/output.js";
import type { DependenciesResult } from "../../src/dependencies/types.js";

// Mock config loader
vi.mock("../../src/config/index.js", () => ({
  loadConfigAsync: vi.fn(),
  getProjectRoot: vi.fn((configPath: string) => path.dirname(configPath)),
}));

import { getProjectRoot, loadConfigAsync } from "../../src/config/index.js";

const mockedLoadConfigAsync = vi.mocked(loadConfigAsync);
const mockedGetProjectRoot = vi.mocked(getProjectRoot);

describe("dependencies module", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-dependencies-test-"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("BUILTIN_MAPPINGS", () => {
    it("contains mappings for eslint", () => {
      expect(BUILTIN_MAPPINGS.eslint).toBeDefined();
      expect(BUILTIN_MAPPINGS.eslint.configFiles).toContain("eslint.config.js");
      expect(BUILTIN_MAPPINGS.eslint.configFiles).toContain(".eslintrc.js");
      expect(BUILTIN_MAPPINGS.eslint.configFiles).toContain(".eslintignore");
    });

    it("contains mappings for typescript", () => {
      expect(BUILTIN_MAPPINGS.tsc).toBeDefined();
      expect(BUILTIN_MAPPINGS.tsc.configFiles).toContain("tsconfig.json");
    });

    it("contains mappings for knip", () => {
      expect(BUILTIN_MAPPINGS.knip).toBeDefined();
      expect(BUILTIN_MAPPINGS.knip.configFiles).toContain("knip.json");
    });

    it("contains mappings for vitest", () => {
      expect(BUILTIN_MAPPINGS.vitest).toBeDefined();
      expect(BUILTIN_MAPPINGS.vitest.configFiles).toContain("vitest.config.ts");
    });

    it("contains mappings for pytest", () => {
      expect(BUILTIN_MAPPINGS.pytest).toBeDefined();
      expect(BUILTIN_MAPPINGS.pytest.configFiles).toContain("pytest.ini");
      expect(BUILTIN_MAPPINGS.pytest.configFiles).toContain("conftest.py");
    });

    it("contains mappings for ruff", () => {
      expect(BUILTIN_MAPPINGS.ruff).toBeDefined();
      expect(BUILTIN_MAPPINGS.ruff.configFiles).toContain("ruff.toml");
    });

    it("contains mappings for secrets (gitleaks)", () => {
      expect(BUILTIN_MAPPINGS.secrets).toBeDefined();
      expect(BUILTIN_MAPPINGS.secrets.configFiles).toContain(".gitleaks.toml");
    });
  });

  describe("ALWAYS_TRACKED", () => {
    it("includes check.toml", () => {
      expect(ALWAYS_TRACKED).toContain("check.toml");
    });

    it("includes GitHub workflows", () => {
      expect(ALWAYS_TRACKED).toContain(".github/workflows/*.yml");
    });

    it("includes repo-metadata.yaml", () => {
      expect(ALWAYS_TRACKED).toContain("repo-metadata.yaml");
    });
  });

  describe("getDependencies", () => {
    it("returns empty dependencies when no tools are enabled", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "");

      mockedLoadConfigAsync.mockResolvedValueOnce({
        config: {},
        configPath,
      });
      mockedGetProjectRoot.mockReturnValueOnce(tempDir);

      const result = await getDependencies({ config: configPath });

      expect(result.dependencies).toEqual({});
      expect(result.project).toBe(".");
      expect(result.checkTomlPath).toBe("check.toml");
    });

    it("returns dependencies for enabled eslint", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "");
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      fs.writeFileSync(path.join(tempDir, ".eslintignore"), "");

      mockedLoadConfigAsync.mockResolvedValueOnce({
        config: {
          code: {
            linting: {
              eslint: { enabled: true },
            },
          },
        },
        configPath,
      });
      mockedGetProjectRoot.mockReturnValueOnce(tempDir);

      const result = await getDependencies({ config: configPath });

      expect(result.dependencies.eslint).toBeDefined();
      expect(result.dependencies.eslint).toContain("eslint.config.js");
      expect(result.dependencies.eslint).toContain(".eslintignore");
    });

    it("filters to specific check with --check option", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "");
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      fs.writeFileSync(path.join(tempDir, ".prettierrc"), "");

      mockedLoadConfigAsync.mockResolvedValueOnce({
        config: {
          code: {
            linting: {
              eslint: { enabled: true },
            },
            formatting: {
              prettier: { enabled: true },
            },
          },
        },
        configPath,
      });
      mockedGetProjectRoot.mockReturnValueOnce(tempDir);

      const result = await getDependencies({ config: configPath, check: "eslint" });

      expect(result.dependencies.eslint).toBeDefined();
      expect(result.dependencies.prettier).toBeUndefined();
    });

    it("includes custom dependencies from config", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "");
      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
      fs.writeFileSync(path.join(tempDir, "custom-eslint-plugin.js"), "");

      mockedLoadConfigAsync.mockResolvedValueOnce({
        config: {
          code: {
            linting: {
              eslint: {
                enabled: true,
                dependencies: ["custom-eslint-plugin.js"],
              },
            },
          },
        },
        configPath,
      });
      mockedGetProjectRoot.mockReturnValueOnce(tempDir);

      const result = await getDependencies({ config: configPath });

      expect(result.dependencies.eslint).toContain("eslint.config.js");
      expect(result.dependencies.eslint).toContain("custom-eslint-plugin.js");
    });

    it("only includes existing files", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "");
      // Only create eslint.config.js, not .eslintrc.js

      fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");

      mockedLoadConfigAsync.mockResolvedValueOnce({
        config: {
          code: {
            linting: {
              eslint: { enabled: true },
            },
          },
        },
        configPath,
      });
      mockedGetProjectRoot.mockReturnValueOnce(tempDir);

      const result = await getDependencies({ config: configPath });

      expect(result.dependencies.eslint).toContain("eslint.config.js");
      expect(result.dependencies.eslint).not.toContain(".eslintrc.js");
    });

    it("includes always-tracked files that exist", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "");

      mockedLoadConfigAsync.mockResolvedValueOnce({
        config: {},
        configPath,
      });
      mockedGetProjectRoot.mockReturnValueOnce(tempDir);

      const result = await getDependencies({ config: configPath });

      expect(result.alwaysTracked).toContain("check.toml");
    });

    it("expands glob patterns", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "");

      // Create workflow files
      fs.mkdirSync(path.join(tempDir, ".github", "workflows"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, ".github", "workflows", "ci.yml"), "");
      fs.writeFileSync(path.join(tempDir, ".github", "workflows", "release.yml"), "");

      mockedLoadConfigAsync.mockResolvedValueOnce({
        config: {},
        configPath,
      });
      mockedGetProjectRoot.mockReturnValueOnce(tempDir);

      const result = await getDependencies({ config: configPath });

      expect(result.alwaysTracked).toContain(".github/workflows/ci.yml");
      expect(result.alwaysTracked).toContain(".github/workflows/release.yml");
    });

    it("deduplicates files in allFiles", async () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(configPath, "");

      mockedLoadConfigAsync.mockResolvedValueOnce({
        config: {},
        configPath,
      });
      mockedGetProjectRoot.mockReturnValueOnce(tempDir);

      const result = await getDependencies({ config: configPath });

      // check.toml is in both dependencies and alwaysTracked
      const checkTomlCount = result.allFiles.filter((f) => f === "check.toml").length;
      expect(checkTomlCount).toBe(1);
    });
  });

  describe("formatDependenciesText", () => {
    it("formats dependencies as text", () => {
      const result: DependenciesResult = {
        project: ".",
        checkTomlPath: "check.toml",
        dependencies: {
          eslint: ["eslint.config.js", ".eslintignore"],
        },
        alwaysTracked: ["check.toml"],
        allFiles: ["check.toml", "eslint.config.js", ".eslintignore"],
      };

      const output = formatDependenciesText(result);

      expect(output).toContain("Dependencies for check.toml");
      expect(output).toContain("eslint:");
      expect(output).toContain("  - eslint.config.js");
      expect(output).toContain("  - .eslintignore");
      expect(output).toContain("Always tracked:");
      expect(output).toContain("  - check.toml");
    });

    it("handles empty dependencies", () => {
      const result: DependenciesResult = {
        project: ".",
        checkTomlPath: "check.toml",
        dependencies: {},
        alwaysTracked: ["check.toml"],
        allFiles: ["check.toml"],
      };

      const output = formatDependenciesText(result);

      expect(output).toContain("Dependencies for check.toml");
      expect(output).toContain("Always tracked:");
      expect(output).not.toContain("eslint:");
    });
  });

  describe("formatDependenciesJson", () => {
    it("formats dependencies as valid JSON", () => {
      const result: DependenciesResult = {
        project: ".",
        checkTomlPath: "check.toml",
        dependencies: {
          eslint: ["eslint.config.js"],
        },
        alwaysTracked: ["check.toml"],
        allFiles: ["check.toml", "eslint.config.js"],
      };

      const output = formatDependenciesJson(result);
      const parsed = JSON.parse(output);

      expect(parsed.project).toBe(".");
      expect(parsed.checkTomlPath).toBe("check.toml");
      expect(parsed.dependencies.eslint).toEqual(["eslint.config.js"]);
      expect(parsed.alwaysTracked).toContain("check.toml");
      expect(parsed.allFiles).toContain("eslint.config.js");
    });
  });
});

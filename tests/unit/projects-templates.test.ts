import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createCheckToml,
  createRegistry,
  getExtendsTemplate,
  getTemplate,
} from "../../src/projects/templates.js";

describe("getTemplate", () => {
  it("returns TypeScript template with eslint and tsc enabled", () => {
    const template = getTemplate("typescript");

    expect(template).toContain("[code.linting.eslint]");
    expect(template).toContain("enabled = true");
    expect(template).toContain("[code.types.tsc]");
  });

  it("returns Python template with ruff enabled", () => {
    const template = getTemplate("python");

    expect(template).toContain("[code.linting.ruff]");
    expect(template).toContain("enabled = true");
  });

  it("returns Rust template with commented config", () => {
    const template = getTemplate("rust");

    expect(template).toContain("Rust");
    expect(template).toContain("#");
  });

  it("returns Go template with commented config", () => {
    const template = getTemplate("go");

    expect(template).toContain("Go");
    expect(template).toContain("#");
  });
});

describe("getExtendsTemplate", () => {
  it("creates extends template with correct registry path", () => {
    const template = getExtendsTemplate("../shared-config", "typescript");

    expect(template).toContain("[extends]");
    expect(template).toContain('registry = "../shared-config"');
    expect(template).toContain('rulesets = ["typescript"]');
  });

  it("uses correct ruleset for python", () => {
    const template = getExtendsTemplate(".cm", "python");

    expect(template).toContain('rulesets = ["python"]');
  });
});

describe("createCheckToml", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-templates-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates check.toml with default template", () => {
    const projectPath = path.join(tempDir, "app");
    fs.mkdirSync(projectPath, { recursive: true });

    const result = createCheckToml(projectPath, "typescript", false);

    expect(result).toBe(true);
    const content = fs.readFileSync(path.join(projectPath, "check.toml"), "utf-8");
    expect(content).toContain("[code.linting.eslint]");
  });

  it("creates check.toml with extends template when registry provided", () => {
    const projectPath = path.join(tempDir, "app");
    fs.mkdirSync(projectPath, { recursive: true });

    createCheckToml(projectPath, "typescript", false, "../.cm");

    const content = fs.readFileSync(path.join(projectPath, "check.toml"), "utf-8");
    expect(content).toContain("[extends]");
    expect(content).toContain('registry = "../.cm"');
  });

  it("does not create file in dry-run mode", () => {
    const projectPath = path.join(tempDir, "app");
    fs.mkdirSync(projectPath, { recursive: true });

    const result = createCheckToml(projectPath, "typescript", true);

    expect(result).toBe(true);
    expect(fs.existsSync(path.join(projectPath, "check.toml"))).toBe(false);
  });

  it("returns false if file already exists", () => {
    const projectPath = path.join(tempDir, "app");
    fs.mkdirSync(projectPath, { recursive: true });
    fs.writeFileSync(path.join(projectPath, "check.toml"), "existing");

    const result = createCheckToml(projectPath, "typescript", false);

    expect(result).toBe(false);
  });
});

describe("createRegistry", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-registry-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates registry directory with rulesets", () => {
    const registryPath = path.join(tempDir, ".cm");
    const projectTypes = new Set<"typescript" | "python">(["typescript", "python"]);

    createRegistry(registryPath, projectTypes, false);

    expect(fs.existsSync(path.join(registryPath, "rulesets", "typescript.toml"))).toBe(true);
    expect(fs.existsSync(path.join(registryPath, "rulesets", "python.toml"))).toBe(true);
  });

  it("creates TypeScript ruleset with correct content", () => {
    const registryPath = path.join(tempDir, ".cm");
    const projectTypes = new Set<"typescript">(["typescript"]);

    createRegistry(registryPath, projectTypes, false);

    const content = fs.readFileSync(path.join(registryPath, "rulesets", "typescript.toml"), "utf-8");
    expect(content).toContain("[code.linting.eslint]");
  });

  it("does not create files in dry-run mode", () => {
    const registryPath = path.join(tempDir, ".cm");
    const projectTypes = new Set<"typescript">(["typescript"]);

    createRegistry(registryPath, projectTypes, true);

    expect(fs.existsSync(registryPath)).toBe(false);
  });
});

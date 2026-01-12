import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CiRunner } from "../../src/process/tools/ci.js";

describe("CiRunner", () => {
  let tempDir: string;
  let runner: CiRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-ci-test-"));
    runner = new CiRunner();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("metadata", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("CI");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("process.ci");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("ci");
    });

    it("has empty configFiles", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("run", () => {
    describe("workflows directory check", () => {
      it("passes when workflows directory exists", async () => {
        fs.mkdirSync(path.join(tempDir, ".github/workflows"), { recursive: true });
        runner.setConfig({ enabled: true });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when workflows directory does not exist", async () => {
        runner.setConfig({ enabled: true });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("GitHub workflows directory not found");
      });

      it("fails when only .github exists but not workflows", async () => {
        fs.mkdirSync(path.join(tempDir, ".github"), { recursive: true });
        runner.setConfig({ enabled: true });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].message).toContain("GitHub workflows directory not found");
      });
    });

    describe("required workflows check", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".github/workflows"), { recursive: true });
      });

      it("passes when all required workflows exist", async () => {
        fs.writeFileSync(path.join(tempDir, ".github/workflows/ci.yml"), "name: CI\n");
        fs.writeFileSync(path.join(tempDir, ".github/workflows/release.yml"), "name: Release\n");
        runner.setConfig({
          enabled: true,
          require_workflows: ["ci.yml", "release.yml"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when required workflow is missing", async () => {
        fs.writeFileSync(path.join(tempDir, ".github/workflows/ci.yml"), "name: CI\n");
        runner.setConfig({
          enabled: true,
          require_workflows: ["ci.yml", "release.yml"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("Required workflow 'release.yml' not found");
        expect(result.violations[0].file).toBe(".github/workflows/release.yml");
      });

      it("reports all missing workflows", async () => {
        runner.setConfig({
          enabled: true,
          require_workflows: ["ci.yml", "release.yml", "deploy.yml"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(3);
      });
    });

    describe("required jobs check", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".github/workflows"), { recursive: true });
      });

      it("passes when all required jobs exist", async () => {
        const workflow = `
name: CI
jobs:
  test:
    runs-on: ubuntu-latest
  lint:
    runs-on: ubuntu-latest
`;
        fs.writeFileSync(path.join(tempDir, ".github/workflows/ci.yml"), workflow);
        runner.setConfig({
          enabled: true,
          jobs: { "ci.yml": ["test", "lint"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when required job is missing", async () => {
        const workflow = `
name: CI
jobs:
  test:
    runs-on: ubuntu-latest
`;
        fs.writeFileSync(path.join(tempDir, ".github/workflows/ci.yml"), workflow);
        runner.setConfig({
          enabled: true,
          jobs: { "ci.yml": ["test", "lint"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("Workflow 'ci.yml' missing required job: lint");
      });

      it("reports all missing jobs", async () => {
        const workflow = `
name: CI
jobs:
  other:
    runs-on: ubuntu-latest
`;
        fs.writeFileSync(path.join(tempDir, ".github/workflows/ci.yml"), workflow);
        runner.setConfig({
          enabled: true,
          jobs: { "ci.yml": ["test", "lint", "build"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(3);
      });

      it("skips job check for missing workflows", async () => {
        runner.setConfig({
          enabled: true,
          jobs: { "ci.yml": ["test"] },
        });

        const result = await runner.run(tempDir);
        // Should pass because we only check jobs for workflows that exist
        expect(result.passed).toBe(true);
      });

      it("handles invalid YAML gracefully", async () => {
        fs.writeFileSync(path.join(tempDir, ".github/workflows/ci.yml"), "invalid: yaml: content:");
        runner.setConfig({
          enabled: true,
          jobs: { "ci.yml": ["test"] },
        });

        const result = await runner.run(tempDir);
        // Should pass because invalid YAML is skipped
        expect(result.passed).toBe(true);
      });
    });

    describe("required actions check", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".github/workflows"), { recursive: true });
      });

      it("passes when all required actions exist", async () => {
        const workflow = `
name: CI
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
`;
        fs.writeFileSync(path.join(tempDir, ".github/workflows/ci.yml"), workflow);
        runner.setConfig({
          enabled: true,
          actions: { "ci.yml": ["actions/checkout", "actions/setup-node"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when required action is missing", async () => {
        const workflow = `
name: CI
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;
        fs.writeFileSync(path.join(tempDir, ".github/workflows/ci.yml"), workflow);
        runner.setConfig({
          enabled: true,
          actions: { "ci.yml": ["actions/checkout", "actions/setup-node"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("Workflow 'ci.yml' missing required action: actions/setup-node");
      });

      it("finds actions across multiple jobs", async () => {
        const workflow = `
name: CI
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
`;
        fs.writeFileSync(path.join(tempDir, ".github/workflows/ci.yml"), workflow);
        runner.setConfig({
          enabled: true,
          actions: { "ci.yml": ["actions/checkout", "actions/setup-node"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("strips version tag when matching actions", async () => {
        const workflow = `
name: CI
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`;
        fs.writeFileSync(path.join(tempDir, ".github/workflows/ci.yml"), workflow);
        runner.setConfig({
          enabled: true,
          actions: { "ci.yml": ["actions/checkout"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("skips action check for missing workflows", async () => {
        runner.setConfig({
          enabled: true,
          actions: { "ci.yml": ["actions/checkout"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });
    });

    describe("combined checks", () => {
      it("reports violations from all check types", async () => {
        fs.mkdirSync(path.join(tempDir, ".github/workflows"), { recursive: true });
        const workflow = `
name: CI
jobs:
  other:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello
`;
        fs.writeFileSync(path.join(tempDir, ".github/workflows/ci.yml"), workflow);
        runner.setConfig({
          enabled: true,
          require_workflows: ["ci.yml", "release.yml"],
          jobs: { "ci.yml": ["test"] },
          actions: { "ci.yml": ["actions/checkout"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        // 1 missing workflow + 1 missing job + 1 missing action
        expect(result.violations).toHaveLength(3);
        expect(result.violations.some((v) => v.message.includes("release.yml"))).toBe(true);
        expect(result.violations.some((v) => v.message.includes("missing required job: test"))).toBe(true);
        expect(result.violations.some((v) => v.message.includes("missing required action: actions/checkout"))).toBe(true);
      });
    });
  });

  describe("audit", () => {
    it("returns same result as run", async () => {
      fs.mkdirSync(path.join(tempDir, ".github/workflows"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, ".github/workflows/ci.yml"), "name: CI\n");
      runner.setConfig({
        enabled: true,
        require_workflows: ["ci.yml"],
      });

      const runResult = await runner.run(tempDir);
      const auditResult = await runner.audit(tempDir);

      expect(auditResult.passed).toBe(runResult.passed);
      expect(auditResult.violations).toEqual(runResult.violations);
    });
  });

  describe("setConfig", () => {
    it("merges config with defaults", async () => {
      fs.mkdirSync(path.join(tempDir, ".github/workflows"), { recursive: true });

      runner.setConfig({ enabled: true });
      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });
  });
});

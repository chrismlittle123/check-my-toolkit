import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ForbiddenFilesRunner } from "../../src/process/tools/forbidden-files.js";

describe("ForbiddenFilesRunner", () => {
  let tempDir: string;
  let runner: ForbiddenFilesRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-forbidden-files-test-"));
    runner = new ForbiddenFilesRunner();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("metadata", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Forbidden Files");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("process.forbidden_files");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("forbidden-files");
    });

    it("has empty configFiles", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("run", () => {
    describe("basic functionality", () => {
      it("passes when no forbidden files patterns are configured", async () => {
        runner.setConfig({ enabled: true });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("passes when no forbidden files exist", async () => {
        fs.writeFileSync(path.join(tempDir, "allowed.txt"), "content");
        runner.setConfig({
          enabled: true,
          files: ["**/.env"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when a forbidden file exists at root", async () => {
        fs.writeFileSync(path.join(tempDir, ".env"), "SECRET=value");
        runner.setConfig({
          enabled: true,
          files: ["**/.env"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].file).toBe(".env");
        expect(result.violations[0].message).toContain("Forbidden file exists");
        expect(result.violations[0].message).toContain("**/.env");
      });

      it("fails when a forbidden file exists in a subdirectory", async () => {
        fs.mkdirSync(path.join(tempDir, "packages", "api"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "packages", "api", ".env"), "SECRET=value");
        runner.setConfig({
          enabled: true,
          files: ["**/.env"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].file).toBe("packages/api/.env");
      });
    });

    describe("multiple patterns", () => {
      it("detects files matching different patterns", async () => {
        fs.writeFileSync(path.join(tempDir, ".env"), "SECRET=value");
        fs.writeFileSync(path.join(tempDir, ".env.local"), "LOCAL=value");
        runner.setConfig({
          enabled: true,
          files: ["**/.env", "**/.env.*"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
        expect(result.violations.some((v) => v.file === ".env")).toBe(true);
        expect(result.violations.some((v) => v.file === ".env.local")).toBe(true);
      });

      it("reports all matching files for each pattern", async () => {
        fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, ".env"), "ROOT=value");
        fs.writeFileSync(path.join(tempDir, "src", ".env"), "SRC=value");
        runner.setConfig({
          enabled: true,
          files: ["**/.env"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
      });
    });

    describe("custom message", () => {
      it("includes custom message in violation", async () => {
        fs.writeFileSync(path.join(tempDir, ".env"), "SECRET=value");
        runner.setConfig({
          enabled: true,
          files: ["**/.env"],
          message: "Use AWS Secrets Manager instead",
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].message).toContain("Use AWS Secrets Manager instead");
      });

      it("works without custom message", async () => {
        fs.writeFileSync(path.join(tempDir, ".env"), "SECRET=value");
        runner.setConfig({
          enabled: true,
          files: ["**/.env"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].message).toContain("Forbidden file exists");
        expect(result.violations[0].message).not.toContain("undefined");
      });
    });

    describe("glob patterns", () => {
      it("matches .env.* pattern", async () => {
        fs.writeFileSync(path.join(tempDir, ".env.local"), "LOCAL=value");
        fs.writeFileSync(path.join(tempDir, ".env.production"), "PROD=value");
        runner.setConfig({
          enabled: true,
          files: ["**/.env.*"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
      });

      it("matches specific file pattern", async () => {
        fs.writeFileSync(path.join(tempDir, "credentials.json"), "{}");
        runner.setConfig({
          enabled: true,
          files: ["**/credentials.json"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
      });

      it("matches extension pattern", async () => {
        fs.writeFileSync(path.join(tempDir, "key.pem"), "private key");
        fs.writeFileSync(path.join(tempDir, "cert.pem"), "certificate");
        runner.setConfig({
          enabled: true,
          files: ["**/*.pem"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
      });
    });

    describe("ignores node_modules and .git", () => {
      it("ignores files in node_modules", async () => {
        fs.mkdirSync(path.join(tempDir, "node_modules", "some-package"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "node_modules", "some-package", ".env"), "content");
        runner.setConfig({
          enabled: true,
          files: ["**/.env"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("ignores files in .git", async () => {
        fs.mkdirSync(path.join(tempDir, ".git", "hooks"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, ".git", "hooks", ".env"), "content");
        runner.setConfig({
          enabled: true,
          files: ["**/.env"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });
    });
  });

  describe("audit", () => {
    it("returns same result as run", async () => {
      fs.writeFileSync(path.join(tempDir, ".env"), "SECRET=value");
      runner.setConfig({
        enabled: true,
        files: ["**/.env"],
      });

      const runResult = await runner.run(tempDir);
      const auditResult = await runner.audit(tempDir);

      expect(auditResult.passed).toBe(runResult.passed);
      expect(auditResult.violations.length).toBe(runResult.violations.length);
    });
  });

  describe("setConfig", () => {
    it("merges config with defaults", async () => {
      runner.setConfig({ enabled: true });
      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });

    it("allows setting files and message", async () => {
      fs.writeFileSync(path.join(tempDir, ".env"), "SECRET=value");
      runner.setConfig({
        enabled: true,
        files: ["**/.env"],
        message: "Custom message",
      });

      const result = await runner.run(tempDir);
      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Custom message");
    });
  });
});

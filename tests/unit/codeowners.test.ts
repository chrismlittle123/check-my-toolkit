import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CodeownersRunner } from "../../src/process/tools/codeowners.js";

describe("CodeownersRunner", () => {
  let tempDir: string;
  let runner: CodeownersRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-codeowners-test-"));
    runner = new CodeownersRunner();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("metadata", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("CODEOWNERS");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("process.codeowners");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("codeowners");
    });

    it("has empty configFiles", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("run", () => {
    describe("file existence", () => {
      it("fails when no CODEOWNERS file exists", async () => {
        runner.setConfig({ enabled: true, rules: [] });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("CODEOWNERS file not found");
      });

      it("finds CODEOWNERS in .github directory", async () => {
        fs.mkdirSync(path.join(tempDir, ".github"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), "* @owner");
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "*", owners: ["@owner"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("finds CODEOWNERS in root directory", async () => {
        fs.writeFileSync(path.join(tempDir, "CODEOWNERS"), "* @owner");
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "*", owners: ["@owner"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("finds CODEOWNERS in docs directory", async () => {
        fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "docs/CODEOWNERS"), "* @owner");
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "*", owners: ["@owner"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("prefers .github/CODEOWNERS over root", async () => {
        fs.mkdirSync(path.join(tempDir, ".github"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), "* @github-owner");
        fs.writeFileSync(path.join(tempDir, "CODEOWNERS"), "* @root-owner");
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "*", owners: ["@github-owner"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });
    });

    describe("rule validation", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".github"), { recursive: true });
      });

      it("passes when all configured rules exist with exact match", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".github/CODEOWNERS"),
          `/check.toml @platform-team
/src/api/* @backend-team
*.js @frontend-team`
        );
        runner.setConfig({
          enabled: true,
          rules: [
            { pattern: "/check.toml", owners: ["@platform-team"] },
            { pattern: "/src/api/*", owners: ["@backend-team"] },
            { pattern: "*.js", owners: ["@frontend-team"] },
          ],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when a configured rule is missing", async () => {
        fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), `/check.toml @platform-team`);
        runner.setConfig({
          enabled: true,
          rules: [
            { pattern: "/check.toml", owners: ["@platform-team"] },
            { pattern: "/src/api/*", owners: ["@backend-team"] },
          ],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("Missing required rule");
        expect(result.violations[0].message).toContain("/src/api/*");
      });

      it("fails when owners do not match", async () => {
        fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), `/check.toml @wrong-team`);
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "/check.toml", owners: ["@platform-team"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("Owner mismatch");
        expect(result.violations[0].message).toContain("@platform-team");
        expect(result.violations[0].message).toContain("@wrong-team");
      });

      it("fails when owners are in wrong order", async () => {
        fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), `/check.toml @team-b @team-a`);
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "/check.toml", owners: ["@team-a", "@team-b"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].message).toContain("Owner mismatch");
      });

      it("passes when owners match in exact order", async () => {
        fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), `/check.toml @team-a @team-b`);
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "/check.toml", owners: ["@team-a", "@team-b"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("fails when extra owners are present", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".github/CODEOWNERS"),
          `/check.toml @team-a @team-b @extra-team`
        );
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "/check.toml", owners: ["@team-a", "@team-b"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].message).toContain("Owner mismatch");
      });

      it("fails when owners are missing", async () => {
        fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), `/check.toml @team-a`);
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "/check.toml", owners: ["@team-a", "@team-b"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].message).toContain("Owner mismatch");
      });
    });

    describe("extra rules validation", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".github"), { recursive: true });
      });

      it("fails when CODEOWNERS has rules not in config", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".github/CODEOWNERS"),
          `/check.toml @platform-team
/extra/path/* @unknown-team`
        );
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "/check.toml", owners: ["@platform-team"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("Unexpected rule not in config");
        expect(result.violations[0].message).toContain("/extra/path/*");
      });

      it("passes when all CODEOWNERS rules are in config", async () => {
        fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), `/check.toml @platform-team`);
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "/check.toml", owners: ["@platform-team"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("reports multiple violations for multiple extra rules", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".github/CODEOWNERS"),
          `/extra1/* @team1
/extra2/* @team2`
        );
        runner.setConfig({
          enabled: true,
          rules: [],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
      });
    });

    describe("CODEOWNERS parsing", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".github"), { recursive: true });
      });

      it("ignores comment lines", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".github/CODEOWNERS"),
          `# This is a comment
/check.toml @platform-team
# Another comment`
        );
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "/check.toml", owners: ["@platform-team"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("ignores empty lines", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".github/CODEOWNERS"),
          `/check.toml @platform-team

/src/* @backend-team`
        );
        runner.setConfig({
          enabled: true,
          rules: [
            { pattern: "/check.toml", owners: ["@platform-team"] },
            { pattern: "/src/*", owners: ["@backend-team"] },
          ],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("handles multiple owners per line", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".github/CODEOWNERS"),
          `/check.toml @owner1 @owner2 @org/team`
        );
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "/check.toml", owners: ["@owner1", "@owner2", "@org/team"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("handles tabs as separators", async () => {
        fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), `/check.toml\t@platform-team`);
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "/check.toml", owners: ["@platform-team"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("handles multiple spaces as separators", async () => {
        fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), `/check.toml    @platform-team`);
        runner.setConfig({
          enabled: true,
          rules: [{ pattern: "/check.toml", owners: ["@platform-team"] }],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("reports correct line numbers in violations", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".github/CODEOWNERS"),
          `# Comment
/check.toml @wrong-team
# Another comment
/src/* @backend-team`
        );
        runner.setConfig({
          enabled: true,
          rules: [
            { pattern: "/check.toml", owners: ["@platform-team"] },
            { pattern: "/src/*", owners: ["@backend-team"] },
          ],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].line).toBe(2);
      });
    });

    describe("malformed lines detection (#114)", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".github"), { recursive: true });
      });

      it("reports violation for line with pattern but no owners", async () => {
        // Bug #114: Lines with pattern but no owners were silently ignored
        fs.writeFileSync(
          path.join(tempDir, ".github/CODEOWNERS"),
          `/valid-path @owner
/path-without-owner
/another-valid @team`
        );
        runner.setConfig({
          enabled: true,
          rules: [
            { pattern: "/valid-path", owners: ["@owner"] },
            { pattern: "/another-valid", owners: ["@team"] },
          ],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.message.includes("no owners"))).toBe(true);
        expect(result.violations.some((v) => v.line === 2)).toBe(true);
      });

      it("reports correct line number for malformed line", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".github/CODEOWNERS"),
          `# Comment line
/valid @owner
/malformed-no-owner
/another @team`
        );
        runner.setConfig({
          enabled: true,
          rules: [
            { pattern: "/valid", owners: ["@owner"] },
            { pattern: "/another", owners: ["@team"] },
          ],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        const malformedViolation = result.violations.find((v) => v.message.includes("no owners"));
        expect(malformedViolation).toBeDefined();
        expect(malformedViolation?.line).toBe(3);
      });
    });

    describe("empty config", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".github"), { recursive: true });
      });

      it("fails when CODEOWNERS has rules but config has none", async () => {
        fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), `/check.toml @platform-team`);
        runner.setConfig({
          enabled: true,
          rules: [],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].message).toContain("Unexpected rule not in config");
      });

      it("passes when both CODEOWNERS and config are empty", async () => {
        fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), "# Empty file");
        runner.setConfig({
          enabled: true,
          rules: [],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });
    });
  });

  describe("audit", () => {
    it("passes when CODEOWNERS file exists", async () => {
      fs.mkdirSync(path.join(tempDir, ".github"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), "* @owner");
      runner.setConfig({ enabled: true });

      const result = await runner.audit(tempDir);
      expect(result.passed).toBe(true);
    });

    it("fails when CODEOWNERS file does not exist", async () => {
      runner.setConfig({ enabled: true });

      const result = await runner.audit(tempDir);
      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("CODEOWNERS file not found");
    });

    it("does not validate content in audit mode", async () => {
      fs.mkdirSync(path.join(tempDir, ".github"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, ".github/CODEOWNERS"), "/extra @team");
      runner.setConfig({
        enabled: true,
        rules: [{ pattern: "/check.toml", owners: ["@platform-team"] }],
      });

      const result = await runner.audit(tempDir);
      // Audit only checks file exists, not content
      expect(result.passed).toBe(true);
    });
  });
});

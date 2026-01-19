import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChangesetsRunner } from "../../src/process/tools/changesets.js";

// Mock execa for git operations
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockExeca = vi.mocked(execa);

describe("ChangesetsRunner", () => {
  let tempDir: string;
  let runner: ChangesetsRunner;
  let originalCwd: () => string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-changesets-test-"));
    runner = new ChangesetsRunner();
    vi.clearAllMocks();

    // Mock process.cwd() to return tempDir for directory checks
    originalCwd = process.cwd;
    process.cwd = () => tempDir;
  });

  afterEach(() => {
    process.cwd = originalCwd;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("metadata", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Changesets");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("process.changesets");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("changesets");
    });

    it("has empty configFiles", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("setConfig", () => {
    it("merges config with defaults", () => {
      runner.setConfig({ enabled: true });
      expect(runner).toBeDefined();
    });

    it("preserves default validate_format as true", async () => {
      fs.mkdirSync(path.join(tempDir, ".changeset"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, ".changeset/test-changeset.md"),
        `---
"my-package": patch
---

Test description`
      );

      runner.setConfig({ enabled: true });
      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });

    it("preserves default require_description as true", async () => {
      fs.mkdirSync(path.join(tempDir, ".changeset"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, ".changeset/test-changeset.md"),
        `---
"my-package": patch
---
`
      );

      runner.setConfig({ enabled: true });
      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations.some((v) => v.message.includes("no description"))).toBe(true);
    });
  });

  describe("run", () => {
    describe("directory check", () => {
      it("fails when .changeset directory missing", async () => {
        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("No .changeset directory found");
        expect(result.violations[0].message).toContain("changeset init");
      });

      it("passes when .changeset directory exists", async () => {
        fs.mkdirSync(path.join(tempDir, ".changeset"), { recursive: true });

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });
    });

    describe("changeset file detection", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".changeset"), { recursive: true });
      });

      it("finds all .md files in .changeset", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/blue-cats-walk.md"),
          `---
"pkg-a": patch
---

Description 1`
        );
        fs.writeFileSync(
          path.join(tempDir, ".changeset/red-dogs-run.md"),
          `---
"pkg-b": minor
---

Description 2`
        );

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("ignores README.md", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/README.md"),
          "# Changesets\n\nThis is the README."
        );

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        // No changeset files found (README ignored), should pass
        expect(result.passed).toBe(true);
      });

      it("ignores config.json", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/config.json"),
          JSON.stringify({ access: "public" })
        );

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("handles empty .changeset directory", async () => {
        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });
    });

    describe("require_for_paths check", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".changeset"), { recursive: true });
      });

      it("skips when no require_for_paths configured", async () => {
        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
        expect(result.skipped).toBe(false);
      });

      it("skips when cannot determine base branch", async () => {
        // Mock git commands to fail for branch detection
        mockExeca.mockRejectedValue(new Error("Not a git repository"));

        runner.setConfig({ enabled: true, require_for_paths: ["src/**"] });
        const result = await runner.run(tempDir);

        expect(result.skipped).toBe(true);
        expect(result.skipReason).toContain("Could not determine changed files");
      });

      it("passes when changes do not match paths", async () => {
        // Mock branch exists - findBaseBranch checks all 4 branches in parallel
        mockExeca
          .mockResolvedValueOnce({ stdout: "", exitCode: 0 } as never) // origin/main exists
          .mockRejectedValueOnce(new Error("not found")) // origin/master
          .mockRejectedValueOnce(new Error("not found")) // main
          .mockRejectedValueOnce(new Error("not found")) // master
          .mockResolvedValueOnce({ stdout: "docs/README.md\ntest/test.ts", exitCode: 0 } as never); // git diff

        runner.setConfig({ enabled: true, require_for_paths: ["src/**"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("fails when changes match paths and no changeset", async () => {
        // Mock branch exists - findBaseBranch checks all 4 branches in parallel
        // Then git diff is called
        mockExeca
          .mockResolvedValueOnce({ stdout: "", exitCode: 0 } as never) // origin/main exists
          .mockRejectedValueOnce(new Error("not found")) // origin/master
          .mockRejectedValueOnce(new Error("not found")) // main
          .mockRejectedValueOnce(new Error("not found")) // master
          .mockResolvedValueOnce({ stdout: "src/index.ts\nsrc/utils.ts", exitCode: 0 } as never); // git diff

        runner.setConfig({ enabled: true, require_for_paths: ["src/**"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("require a changeset");
        expect(result.violations[0].rule).toBe("process.changesets.required");
      });

      it("passes when changes match paths and changeset exists", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/my-changeset.md"),
          `---
"my-package": patch
---

Added new feature`
        );

        mockExeca
          .mockResolvedValueOnce({ stdout: "", exitCode: 0 } as never) // origin/main exists
          .mockRejectedValueOnce(new Error("not found")) // origin/master
          .mockRejectedValueOnce(new Error("not found")) // main
          .mockRejectedValueOnce(new Error("not found")) // master
          .mockResolvedValueOnce({ stdout: "src/index.ts", exitCode: 0 } as never); // git diff

        runner.setConfig({ enabled: true, require_for_paths: ["src/**"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("respects exclude_paths", async () => {
        mockExeca
          .mockResolvedValueOnce({ stdout: "", exitCode: 0 } as never) // origin/main exists
          .mockRejectedValueOnce(new Error("not found")) // origin/master
          .mockRejectedValueOnce(new Error("not found")) // main
          .mockRejectedValueOnce(new Error("not found")) // master
          .mockResolvedValueOnce({ stdout: "src/generated/types.ts", exitCode: 0 } as never); // git diff

        runner.setConfig({
          enabled: true,
          require_for_paths: ["src/**"],
          exclude_paths: ["src/generated/**"],
        });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });
    });

    describe("format validation", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".changeset"), { recursive: true });
      });

      it("passes with valid frontmatter", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/valid.md"),
          `---
"my-package": patch
---

This is a valid description.`
        );

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("fails when missing frontmatter delimiters", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/invalid.md"),
          `"my-package": patch

Missing frontmatter delimiters`
        );

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(
          result.violations.some((v) => v.message.includes("Missing frontmatter delimiters"))
        ).toBe(true);
      });

      it("fails when no packages in frontmatter", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/empty-frontmatter.md"),
          `---
---

Just a description, no packages`
        );

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.message.includes("no package entries"))).toBe(true);
      });

      it("parses package bump types correctly", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/multi-pkg.md"),
          `---
"package-a": major
"package-b": minor
"package-c": patch
---

Multiple packages updated`
        );

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("skips format validation when validate_format is false", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/no-packages.md"),
          `---
---

Description only`
        );

        runner.setConfig({ enabled: true, validate_format: false, require_description: false });
        const result = await runner.run(tempDir);

        // Should pass because format validation is disabled
        expect(result.passed).toBe(true);
      });
    });

    describe("bump type validation", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".changeset"), { recursive: true });
      });

      it("passes when bump type is allowed", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/test.md"),
          `---
"my-package": patch
---

Patch fix`
        );

        runner.setConfig({ enabled: true, allowed_bump_types: ["patch", "minor"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("fails when bump type not allowed", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/test.md"),
          `---
"my-package": major
---

Major change`
        );

        runner.setConfig({ enabled: true, allowed_bump_types: ["patch", "minor"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain('"major"');
        expect(result.violations[0].message).toContain("only patch, minor are allowed");
      });

      it("validates all packages", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/test.md"),
          `---
"pkg-a": major
"pkg-b": major
---

Both have major bumps`
        );

        runner.setConfig({ enabled: true, allowed_bump_types: ["patch"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
      });

      it("skips bump type validation when no allowed_bump_types configured", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/test.md"),
          `---
"my-package": major
---

Major change allowed`
        );

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });
    });

    describe("description validation", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".changeset"), { recursive: true });
      });

      it("skips when require_description is false", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/test.md"),
          `---
"my-package": patch
---
`
        );

        runner.setConfig({ enabled: true, require_description: false });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("fails when description missing", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/test.md"),
          `---
"my-package": patch
---
`
        );

        runner.setConfig({ enabled: true, require_description: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.message.includes("no description"))).toBe(true);
      });

      it("fails when description too short", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/test.md"),
          `---
"my-package": patch
---

Fix`
        );

        runner.setConfig({ enabled: true, min_description_length: 10 });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.message.includes("minimum is 10"))).toBe(true);
      });

      it("passes when description meets minimum", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/test.md"),
          `---
"my-package": patch
---

This is a detailed description of the fix.`
        );

        runner.setConfig({ enabled: true, min_description_length: 10 });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });
    });

    describe("combined validations", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".changeset"), { recursive: true });
      });

      it("reports multiple violations", async () => {
        // Invalid bump type + no description
        fs.writeFileSync(
          path.join(tempDir, ".changeset/test.md"),
          `---
"my-package": major
---
`
        );

        runner.setConfig({
          enabled: true,
          allowed_bump_types: ["patch"],
          require_description: true,
        });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations.length).toBeGreaterThanOrEqual(2);
      });

      it("validates multiple changeset files", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/valid.md"),
          `---
"pkg-a": patch
---

Valid changeset`
        );
        fs.writeFileSync(
          path.join(tempDir, ".changeset/invalid.md"),
          `---
"pkg-b": major
---

Invalid bump`
        );

        runner.setConfig({ enabled: true, allowed_bump_types: ["patch", "minor"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].file).toContain("invalid.md");
      });
    });

    describe("edge cases", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".changeset"), { recursive: true });
      });

      it("handles whitespace in frontmatter", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/test.md"),
          `---
  "my-package": patch
---

Description`
        );

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("handles single quote package names", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/test.md"),
          `---
'@scope/package': minor
---

Scoped package update`
        );

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("checks base branches in correct order (origin/main first)", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/test.md"),
          `---
"my-package": patch
---

Description`
        );

        // Branches checked in parallel: origin/main, origin/master, main, master
        // origin/main fails, origin/master succeeds, then git diff
        mockExeca
          .mockRejectedValueOnce(new Error("not found")) // origin/main fails
          .mockResolvedValueOnce({ stdout: "", exitCode: 0 } as never) // origin/master exists
          .mockRejectedValueOnce(new Error("not found")) // main
          .mockRejectedValueOnce(new Error("not found")) // master
          .mockResolvedValueOnce({ stdout: "src/test.ts", exitCode: 0 } as never); // git diff

        runner.setConfig({ enabled: true, require_for_paths: ["src/**"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("tries local main/master when origin fails", async () => {
        fs.writeFileSync(
          path.join(tempDir, ".changeset/test.md"),
          `---
"my-package": patch
---

Description`
        );

        // All branches checked in parallel
        mockExeca
          .mockRejectedValueOnce(new Error("not found")) // origin/main fails
          .mockRejectedValueOnce(new Error("not found")) // origin/master fails
          .mockResolvedValueOnce({ stdout: "", exitCode: 0 } as never) // local main exists
          .mockRejectedValueOnce(new Error("not found")) // local master fails
          .mockResolvedValueOnce({ stdout: "", exitCode: 0 } as never); // git diff

        runner.setConfig({ enabled: true, require_for_paths: ["src/**"] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });
    });
  });

  describe("audit", () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(tempDir, ".changeset"), { recursive: true });
    });

    it("returns same result as run", async () => {
      fs.writeFileSync(
        path.join(tempDir, ".changeset/test.md"),
        `---
"my-package": patch
---

Description`
      );

      runner.setConfig({ enabled: true });

      const runResult = await runner.run(tempDir);
      const auditResult = await runner.audit(tempDir);

      expect(auditResult.passed).toBe(runResult.passed);
      expect(auditResult.violations).toEqual(runResult.violations);
    });
  });
});

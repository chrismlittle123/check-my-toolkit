import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DocsRunner } from "../../src/process/tools/docs.js";

// Mock execa for git operations
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockExeca = vi.mocked(execa);

describe("DocsRunner", () => {
  let tempDir: string;
  let runner: DocsRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-docs-test-"));
    runner = new DocsRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("metadata", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Documentation");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("process.docs");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("docs");
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

    it("preserves default path as docs/", async () => {
      fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, "docs/guide.md"), "# Guide\n");

      runner.setConfig({ enabled: true });
      const result = await runner.run(tempDir);

      // Should pass because docs are in docs/
      expect(result.passed).toBe(true);
    });

    it("sets enforcement level", async () => {
      fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, "outside.md"), "# Outside\n");

      runner.setConfig({ enabled: true, enforcement: "block" });
      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].severity).toBe("error");
    });
  });

  describe("run", () => {
    describe("structure checks", () => {
      describe("allowlist", () => {
        it("passes when all md files in docs directory", async () => {
          fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
          fs.writeFileSync(path.join(tempDir, "docs/guide.md"), "# Guide\n");
          fs.writeFileSync(path.join(tempDir, "docs/api.md"), "# API\n");

          runner.setConfig({ enabled: true });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
          expect(result.violations).toHaveLength(0);
        });

        it("passes when outside md file is in allowlist", async () => {
          fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
          fs.writeFileSync(path.join(tempDir, "docs/guide.md"), "# Guide\n");
          fs.writeFileSync(path.join(tempDir, "README.md"), "# README\n");

          runner.setConfig({ enabled: true, allowlist: ["README.md"] });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        });

        it("fails when outside md file not in allowlist", async () => {
          fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
          fs.writeFileSync(path.join(tempDir, "docs/guide.md"), "# Guide\n");
          fs.writeFileSync(path.join(tempDir, "outside.md"), "# Outside\n");

          runner.setConfig({ enabled: true });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(false);
          expect(result.violations).toHaveLength(1);
          expect(result.violations[0].message).toContain("not allowlisted");
          expect(result.violations[0].file).toBe("outside.md");
        });

        it("allowlist matches by full path", async () => {
          fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
          fs.mkdirSync(path.join(tempDir, "other"), { recursive: true });
          fs.writeFileSync(path.join(tempDir, "other/notes.md"), "# Notes\n");

          runner.setConfig({ enabled: true, allowlist: ["other/notes.md"] });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        });

        it("allowlist matches by basename", async () => {
          fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
          fs.writeFileSync(path.join(tempDir, "CHANGELOG.md"), "# Changelog\n");

          runner.setConfig({ enabled: true, allowlist: ["CHANGELOG.md"] });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        });
      });

      describe("file limits", () => {
        beforeEach(() => {
          fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
        });

        it("passes when under max_files limit", async () => {
          fs.writeFileSync(path.join(tempDir, "docs/one.md"), "# One\n");
          fs.writeFileSync(path.join(tempDir, "docs/two.md"), "# Two\n");

          runner.setConfig({ enabled: true, max_files: 5 });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        });

        it("fails when exceeding max_files limit", async () => {
          for (let i = 0; i < 5; i++) {
            fs.writeFileSync(path.join(tempDir, `docs/file${i}.md`), `# File ${i}\n`);
          }

          runner.setConfig({ enabled: true, max_files: 3 });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(false);
          expect(result.violations.some((v) => v.message.includes("5 files"))).toBe(true);
          expect(result.violations.some((v) => v.message.includes("max allowed is 3"))).toBe(true);
        });

        it("passes when under max_file_lines limit", async () => {
          fs.writeFileSync(path.join(tempDir, "docs/short.md"), "# Short\nLine 2\nLine 3\n");

          runner.setConfig({ enabled: true, max_file_lines: 100 });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        });

        it("fails when file exceeds max_file_lines limit", async () => {
          const longContent = Array(200).fill("Line").join("\n");
          fs.writeFileSync(path.join(tempDir, "docs/long.md"), longContent);

          runner.setConfig({ enabled: true, max_file_lines: 100 });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(false);
          expect(result.violations.some((v) => v.message.includes("200 lines"))).toBe(true);
        });

        it("passes when total size under max_total_kb", async () => {
          fs.writeFileSync(path.join(tempDir, "docs/small.md"), "# Small file\n");

          runner.setConfig({ enabled: true, max_total_kb: 100 });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        });

        it("fails when total size exceeds max_total_kb", async () => {
          // Create a file larger than 1KB
          const largeContent = "x".repeat(2000);
          fs.writeFileSync(path.join(tempDir, "docs/large.md"), largeContent);

          runner.setConfig({ enabled: true, max_total_kb: 1 });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(false);
          expect(result.violations.some((v) => v.message.includes("Total docs size"))).toBe(true);
        });
      });
    });

    describe("content validation", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
      });

      describe("frontmatter", () => {
        it("passes when required fields present", async () => {
          fs.writeFileSync(
            path.join(tempDir, "docs/guide.md"),
            `---
type: guide
title: My Guide
author: John Doe
---

# Guide Content`
          );

          runner.setConfig({
            enabled: true,
            types: {
              guide: {
                frontmatter: ["title", "author"],
              },
            },
          });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        });

        it("fails when missing required frontmatter field", async () => {
          fs.writeFileSync(
            path.join(tempDir, "docs/guide.md"),
            `---
type: guide
title: My Guide
---

# Guide Content`
          );

          runner.setConfig({
            enabled: true,
            types: {
              guide: {
                frontmatter: ["title", "author"],
              },
            },
          });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(false);
          expect(
            result.violations.some((v) => v.message.includes("Missing required frontmatter"))
          ).toBe(true);
          expect(result.violations.some((v) => v.message.includes("author"))).toBe(true);
        });

        it("reports all missing fields", async () => {
          fs.writeFileSync(
            path.join(tempDir, "docs/guide.md"),
            `---
type: guide
---

# Guide`
          );

          runner.setConfig({
            enabled: true,
            types: {
              guide: {
                frontmatter: ["title", "author", "version"],
              },
            },
          });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(false);
          const frontmatterViolations = result.violations.filter((v) =>
            v.message.includes("Missing required frontmatter")
          );
          expect(frontmatterViolations).toHaveLength(3);
        });
      });

      describe("sections", () => {
        it("passes when required sections exist", async () => {
          fs.writeFileSync(
            path.join(tempDir, "docs/api.md"),
            `---
type: api
---

# API Reference

## Overview

Description here.

## Usage

Code examples.`
          );

          runner.setConfig({
            enabled: true,
            types: {
              api: {
                required_sections: ["Overview", "Usage"],
              },
            },
          });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        });

        it("fails when missing required section", async () => {
          fs.writeFileSync(
            path.join(tempDir, "docs/api.md"),
            `---
type: api
---

# API Reference

## Overview

Description only.`
          );

          runner.setConfig({
            enabled: true,
            types: {
              api: {
                required_sections: ["Overview", "Usage"],
              },
            },
          });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(false);
          expect(
            result.violations.some((v) => v.message.includes("Missing required section"))
          ).toBe(true);
          expect(result.violations.some((v) => v.message.includes("Usage"))).toBe(true);
        });

        it("case insensitive section matching", async () => {
          fs.writeFileSync(
            path.join(tempDir, "docs/api.md"),
            `---
type: api
---

# API

## OVERVIEW

Content here.`
          );

          runner.setConfig({
            enabled: true,
            types: {
              api: {
                required_sections: ["overview"],
              },
            },
          });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        });
      });

      describe("internal links", () => {
        it("passes when all links valid", async () => {
          fs.writeFileSync(path.join(tempDir, "docs/index.md"), "# Index\n");
          fs.writeFileSync(
            path.join(tempDir, "docs/guide.md"),
            `---
type: guide
---

# Guide

Check the [index](./index.md) for more info.`
          );

          // Need types config to trigger content validation which includes link checking
          runner.setConfig({ enabled: true, types: { guide: {} } });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        });

        it("fails when internal link broken", async () => {
          fs.writeFileSync(
            path.join(tempDir, "docs/guide.md"),
            `---
type: guide
---

# Guide

Check the [missing](./nonexistent.md) page.`
          );

          // Need types config to trigger content validation which includes link checking
          runner.setConfig({ enabled: true, types: { guide: {} } });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(false);
          expect(result.violations.some((v) => v.message.includes("Broken internal link"))).toBe(
            true
          );
        });

        it("ignores external http links", async () => {
          fs.writeFileSync(
            path.join(tempDir, "docs/guide.md"),
            `---
type: guide
---

# Guide

Check [external](https://example.com) site.`
          );

          runner.setConfig({ enabled: true, types: { guide: {} } });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        });

        it("ignores anchor links", async () => {
          fs.writeFileSync(
            path.join(tempDir, "docs/guide.md"),
            `---
type: guide
---

# Guide

## Section A

Jump to [Section B](#section-b).

## Section B

Content here.`
          );

          runner.setConfig({ enabled: true, types: { guide: {} } });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        });

        it("ignores mailto links", async () => {
          fs.writeFileSync(
            path.join(tempDir, "docs/guide.md"),
            `---
type: guide
---

# Guide

Contact [support](mailto:support@example.com).`
          );

          runner.setConfig({ enabled: true, types: { guide: {} } });
          const result = await runner.run(tempDir);

          expect(result.passed).toBe(true);
        });
      });
    });

    describe("freshness tracking", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
        fs.mkdirSync(path.join(tempDir, "src/utils"), { recursive: true });
      });

      it("passes when doc is fresh", async () => {
        fs.writeFileSync(
          path.join(tempDir, "docs/utils.md"),
          `---
tracks: src/utils/
---

# Utils Documentation`
        );
        fs.writeFileSync(path.join(tempDir, "src/utils/index.ts"), "export const foo = 1;");

        // Mock git log: doc was updated after source
        const now = Math.floor(Date.now() / 1000);
        mockExeca
          .mockResolvedValueOnce({ stdout: String(now), exitCode: 0 } as never) // doc timestamp
          .mockResolvedValueOnce({ stdout: String(now - 86400), exitCode: 0 } as never); // source timestamp (1 day older)

        runner.setConfig({ enabled: true, staleness_days: 30 });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("fails when doc is stale", async () => {
        fs.writeFileSync(
          path.join(tempDir, "docs/utils.md"),
          `---
tracks: src/utils/
---

# Utils Documentation`
        );
        fs.writeFileSync(path.join(tempDir, "src/utils/index.ts"), "export const foo = 1;");

        // Mock git log: source was updated 60 days after doc
        const now = Math.floor(Date.now() / 1000);
        mockExeca
          .mockResolvedValueOnce({ stdout: String(now - 60 * 86400), exitCode: 0 } as never) // doc timestamp (60 days old)
          .mockResolvedValueOnce({ stdout: String(now), exitCode: 0 } as never); // source timestamp (now)

        runner.setConfig({ enabled: true, staleness_days: 30 });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.message.includes("days behind"))).toBe(true);
      });

      it("uses frontmatter tracks field", async () => {
        fs.writeFileSync(
          path.join(tempDir, "docs/api.md"),
          `---
tracks: src/api/index.ts
---

# API`
        );
        fs.mkdirSync(path.join(tempDir, "src/api"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "src/api/index.ts"), "export const api = {};");

        const now = Math.floor(Date.now() / 1000);
        mockExeca
          .mockResolvedValueOnce({ stdout: String(now), exitCode: 0 } as never)
          .mockResolvedValueOnce({ stdout: String(now), exitCode: 0 } as never);

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(mockExeca).toHaveBeenCalledWith(
          "git",
          ["log", "-1", "--format=%ct", "--", "src/api/index.ts"],
          expect.any(Object)
        );
        expect(result.passed).toBe(true);
      });

      it("uses stale_mappings config", async () => {
        fs.writeFileSync(path.join(tempDir, "docs/custom.md"), "# Custom\n");
        fs.writeFileSync(path.join(tempDir, "src/utils/custom.ts"), "export const custom = 1;");

        const now = Math.floor(Date.now() / 1000);
        mockExeca
          .mockResolvedValueOnce({ stdout: String(now), exitCode: 0 } as never)
          .mockResolvedValueOnce({ stdout: String(now), exitCode: 0 } as never);

        runner.setConfig({
          enabled: true,
          stale_mappings: {
            "docs/custom.md": "src/utils/custom.ts",
          },
        });
        const result = await runner.run(tempDir);

        expect(mockExeca).toHaveBeenCalledWith(
          "git",
          ["log", "-1", "--format=%ct", "--", "src/utils/custom.ts"],
          expect.any(Object)
        );
        expect(result.passed).toBe(true);
      });

      it("falls back to src/ convention", async () => {
        fs.writeFileSync(path.join(tempDir, "docs/utils.md"), "# Utils\n");
        fs.mkdirSync(path.join(tempDir, "src/utils"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "src/utils/index.ts"), "export const utils = 1;");

        const now = Math.floor(Date.now() / 1000);
        mockExeca
          .mockResolvedValueOnce({ stdout: String(now), exitCode: 0 } as never)
          .mockResolvedValueOnce({ stdout: String(now), exitCode: 0 } as never);

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(mockExeca).toHaveBeenCalledWith(
          "git",
          ["log", "-1", "--format=%ct", "--", "src/utils/"],
          expect.any(Object)
        );
        expect(result.passed).toBe(true);
      });

      it("handles missing git history", async () => {
        fs.writeFileSync(
          path.join(tempDir, "docs/utils.md"),
          `---
tracks: src/utils/
---

# Utils`
        );
        fs.writeFileSync(path.join(tempDir, "src/utils/index.ts"), "export const foo = 1;");

        mockExeca.mockRejectedValue(new Error("not a git repository"));

        runner.setConfig({ enabled: true, staleness_days: 30 });
        const result = await runner.run(tempDir);

        // Should pass because we can't determine staleness without git
        expect(result.passed).toBe(true);
      });
    });

    describe("API coverage", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
        fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });
      });

      it("skips when min_coverage not set", async () => {
        fs.writeFileSync(path.join(tempDir, "docs/api.md"), "# API\n");
        fs.writeFileSync(path.join(tempDir, "src/index.ts"), "export const foo = 1;");

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        // No coverage check when min_coverage not set
        expect(result.passed).toBe(true);
      });

      it("passes when coverage above threshold", async () => {
        fs.writeFileSync(
          path.join(tempDir, "docs/api.md"),
          `# API

The \`foo\` function does X.
The \`bar\` function does Y.`
        );
        fs.writeFileSync(
          path.join(tempDir, "src/index.ts"),
          `export const foo = 1;
export const bar = 2;`
        );

        runner.setConfig({ enabled: true, min_coverage: 50 });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("fails when coverage below threshold", async () => {
        fs.writeFileSync(path.join(tempDir, "docs/api.md"), "# API\n\nSome content.\n");
        fs.writeFileSync(
          path.join(tempDir, "src/index.ts"),
          `export const foo = 1;
export const bar = 2;
export const baz = 3;`
        );

        runner.setConfig({ enabled: true, min_coverage: 80 });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(
          result.violations.some((v) => v.message.includes("API documentation coverage"))
        ).toBe(true);
        expect(result.violations.some((v) => v.message.includes("undocumented exports"))).toBe(
          true
        );
      });

      it("extracts exports from TypeScript files", async () => {
        fs.writeFileSync(
          path.join(tempDir, "docs/api.md"),
          `# API

The \`myFunction\` helper.
The \`MyClass\` class.`
        );
        fs.writeFileSync(
          path.join(tempDir, "src/index.ts"),
          `export function myFunction() {}
export class MyClass {}`
        );

        runner.setConfig({ enabled: true, min_coverage: 100 });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("respects exclude_patterns", async () => {
        fs.writeFileSync(path.join(tempDir, "docs/api.md"), "# API\n");
        fs.writeFileSync(path.join(tempDir, "src/index.ts"), "export const main = 1;");
        fs.writeFileSync(path.join(tempDir, "src/index.test.ts"), "export const testHelper = 1;");

        runner.setConfig({
          enabled: true,
          min_coverage: 100,
          exclude_patterns: ["**/*.test.ts"],
        });
        const result = await runner.run(tempDir);

        // Only main needs to be documented, testHelper is excluded
        expect(result.violations.every((v) => !v.message.includes("testHelper"))).toBe(true);
      });

      it("limits undocumented export reports", async () => {
        fs.writeFileSync(path.join(tempDir, "docs/api.md"), "# API\n");

        // Create 15 exports
        const exports = Array(15)
          .fill(null)
          .map((_, i) => `export const export${i} = ${i};`)
          .join("\n");
        fs.writeFileSync(path.join(tempDir, "src/index.ts"), exports);

        runner.setConfig({ enabled: true, min_coverage: 80 });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);

        // Should have coverage violation + up to 10 individual violations + "and X more" message
        const undocumentedViolations = result.violations.filter((v) =>
          v.message.includes("not documented")
        );
        expect(undocumentedViolations.length).toBeLessThanOrEqual(10);
        expect(result.violations.some((v) => v.message.includes("and"))).toBe(true);
      });
    });

    describe("enforcement levels", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
      });

      it('returns warning severity for "warn"', async () => {
        fs.writeFileSync(path.join(tempDir, "outside.md"), "# Outside\n");

        runner.setConfig({ enabled: true, enforcement: "warn" });
        const result = await runner.run(tempDir);

        expect(result.violations[0].severity).toBe("warning");
      });

      it('returns error severity for "block"', async () => {
        fs.writeFileSync(path.join(tempDir, "outside.md"), "# Outside\n");

        runner.setConfig({ enabled: true, enforcement: "block" });
        const result = await runner.run(tempDir);

        expect(result.violations[0].severity).toBe("error");
      });
    });

    describe("edge cases", () => {
      it("handles empty project", async () => {
        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("handles docs directory without md files", async () => {
        fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "docs/image.png"), "fake image");

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("handles nested docs directories", async () => {
        fs.mkdirSync(path.join(tempDir, "docs/guides/advanced"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "docs/guides/basic.md"), "# Basic\n");
        fs.writeFileSync(path.join(tempDir, "docs/guides/advanced/expert.md"), "# Expert\n");

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("skips types validation when no types configured", async () => {
        fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
        fs.writeFileSync(
          path.join(tempDir, "docs/guide.md"),
          `---
type: guide
---

# Guide without required sections`
        );

        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        // Should pass because no types are configured
        expect(result.passed).toBe(true);
      });
    });
  });

  describe("audit", () => {
    it("returns same result as run", async () => {
      fs.mkdirSync(path.join(tempDir, "docs"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, "docs/guide.md"), "# Guide\n");

      runner.setConfig({ enabled: true });

      const runResult = await runner.run(tempDir);
      const auditResult = await runner.audit(tempDir);

      expect(auditResult.passed).toBe(runResult.passed);
      expect(auditResult.violations).toEqual(runResult.violations);
    });
  });
});

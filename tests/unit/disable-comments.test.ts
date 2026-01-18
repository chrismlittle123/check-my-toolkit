import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DisableCommentsRunner } from "../../src/code/tools/disable-comments.js";

describe("DisableCommentsRunner", () => {
  let tempDir: string;
  let runner: DisableCommentsRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-disable-comments-test-"));
    runner = new DisableCommentsRunner();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Disable Comments");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.quality");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("disable-comments");
    });

    it("has empty config files", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("run with default patterns", () => {
    it("passes when no disable comments exist", async () => {
      fs.writeFileSync(path.join(tempDir, "clean.ts"), `const x = 1;\nconsole.log(x);\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("detects eslint-disable comment", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.ts"), `// eslint-disable\nconst x = 1;\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].file).toBe("bad.ts");
      expect(result.violations[0].line).toBe(1);
      expect(result.violations[0].message).toContain("eslint-disable");
    });

    it("detects eslint-disable-line comment", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.ts"), `const x = 1; // eslint-disable-line\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("eslint-disable-line");
    });

    it("detects eslint-disable-next-line comment", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.ts"), `// eslint-disable-next-line\nconst x = 1;\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("eslint-disable-next-line");
    });

    it("detects @ts-ignore comment", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.ts"), `// @ts-ignore\nconst x: string = 1;\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("@ts-ignore");
    });

    it("detects @ts-expect-error comment", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.ts"), `// @ts-expect-error\nconst x: string = 1;\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("@ts-expect-error");
    });

    it("detects @ts-nocheck comment", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.ts"), `// @ts-nocheck\nconst x = 1;\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("@ts-nocheck");
    });

    it("detects # noqa comment in Python", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.py"), `x = 1  # noqa\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].file).toBe("bad.py");
      expect(result.violations[0].message).toContain("# noqa");
    });

    it("detects # type: ignore comment in Python", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.py"), `x: str = 1  # type: ignore\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("# type: ignore");
    });

    it("detects # pylint: disable comment", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.py"), `# pylint: disable=C0111\ndef foo(): pass\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("# pylint: disable");
    });

    it("detects prettier-ignore comment", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.ts"), `// prettier-ignore\nconst x={a:1,b:2};\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("prettier-ignore");
    });

    it("detects multiple violations in same file", async () => {
      fs.writeFileSync(
        path.join(tempDir, "bad.ts"),
        `// @ts-ignore\nconst x = 1;\n// eslint-disable-next-line\nconst y = 2;\n`
      );

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
    });

    it("detects violations across multiple files", async () => {
      fs.writeFileSync(path.join(tempDir, "bad1.ts"), `// @ts-ignore\n`);
      fs.writeFileSync(path.join(tempDir, "bad2.ts"), `// eslint-disable\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
    });

    it("reports only first pattern per line", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.ts"), `// eslint-disable @ts-ignore\n`);

      const result = await runner.run(tempDir);

      // Only one violation per line, even if multiple patterns match
      expect(result.violations).toHaveLength(1);
    });
  });

  describe("file extension filtering", () => {
    it("scans .ts files by default", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.ts"), `// @ts-ignore\n`);

      const result = await runner.run(tempDir);

      expect(result.violations).toHaveLength(1);
    });

    it("scans .tsx files by default", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.tsx"), `// @ts-ignore\n`);

      const result = await runner.run(tempDir);

      expect(result.violations).toHaveLength(1);
    });

    it("scans .js files by default", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.js"), `// eslint-disable\n`);

      const result = await runner.run(tempDir);

      expect(result.violations).toHaveLength(1);
    });

    it("scans .jsx files by default", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.jsx"), `// eslint-disable\n`);

      const result = await runner.run(tempDir);

      expect(result.violations).toHaveLength(1);
    });

    it("scans .py files by default", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.py"), `# noqa\n`);

      const result = await runner.run(tempDir);

      expect(result.violations).toHaveLength(1);
    });

    it("ignores unrecognized extensions by default", async () => {
      fs.writeFileSync(path.join(tempDir, "bad.txt"), `// @ts-ignore\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });
  });

  describe("exclude patterns", () => {
    it("excludes node_modules by default", async () => {
      fs.mkdirSync(path.join(tempDir, "node_modules"));
      fs.writeFileSync(path.join(tempDir, "node_modules", "bad.ts"), `// @ts-ignore\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("excludes dist by default", async () => {
      fs.mkdirSync(path.join(tempDir, "dist"));
      fs.writeFileSync(path.join(tempDir, "dist", "bad.js"), `// eslint-disable\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("excludes build by default", async () => {
      fs.mkdirSync(path.join(tempDir, "build"));
      fs.writeFileSync(path.join(tempDir, "build", "bad.js"), `// eslint-disable\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });
  });

  describe("custom configuration", () => {
    it("uses custom patterns when provided", async () => {
      runner.setConfig({
        enabled: true,
        patterns: ["CUSTOM_DISABLE"],
      });

      fs.writeFileSync(path.join(tempDir, "bad.ts"), `// CUSTOM_DISABLE\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("CUSTOM_DISABLE");
    });

    it("does not detect default patterns when custom patterns are set", async () => {
      runner.setConfig({
        enabled: true,
        patterns: ["CUSTOM_DISABLE"],
      });

      fs.writeFileSync(path.join(tempDir, "bad.ts"), `// @ts-ignore\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("uses custom extensions when provided", async () => {
      runner.setConfig({
        enabled: true,
        extensions: ["md"],
      });

      fs.writeFileSync(path.join(tempDir, "bad.md"), `<!-- eslint-disable -->\n`);
      fs.writeFileSync(path.join(tempDir, "bad.ts"), `// eslint-disable\n`);

      const result = await runner.run(tempDir);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].file).toBe("bad.md");
    });

    it("uses custom exclude patterns", async () => {
      runner.setConfig({
        enabled: true,
        exclude: ["**/tests/**"],
      });

      fs.mkdirSync(path.join(tempDir, "tests"));
      fs.writeFileSync(path.join(tempDir, "tests", "bad.ts"), `// @ts-ignore\n`);
      fs.writeFileSync(path.join(tempDir, "src.ts"), `// @ts-ignore\n`);

      const result = await runner.run(tempDir);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].file).toBe("src.ts");
    });
  });

  describe("audit", () => {
    it("passes with default config", async () => {
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("passes with valid custom patterns", async () => {
      runner.setConfig({
        enabled: true,
        patterns: ["CUSTOM_PATTERN"],
      });

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("fails with empty patterns array", async () => {
      runner.setConfig({
        enabled: true,
        patterns: [],
      });

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("At least one pattern");
    });
  });

  describe("edge cases", () => {
    it("handles empty directory", async () => {
      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("handles files in subdirectories", async () => {
      fs.mkdirSync(path.join(tempDir, "src", "components"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, "src", "components", "bad.ts"), `// @ts-ignore\n`);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].file).toBe(path.join("src", "components", "bad.ts"));
    });

    it("truncates long line content in message", async () => {
      const longComment = `// eslint-disable ${"x".repeat(100)}`;
      fs.writeFileSync(path.join(tempDir, "bad.ts"), longComment + "\n");

      const result = await runner.run(tempDir);

      expect(result.violations[0].message).toContain("...");
      expect(result.violations[0].message.length).toBeLessThan(longComment.length + 50);
    });
  });
});

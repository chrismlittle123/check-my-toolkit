import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { NamingRunner } from "../../src/code/tools/naming.js";

describe("NamingRunner", () => {
  let tempDir: string;
  let runner: NamingRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-naming-test-"));
    runner = new NamingRunner();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Naming");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.naming");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("naming");
    });

    it("has empty config files", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("run", () => {
    describe("with no rules configured", () => {
      it("passes when no rules are set", async () => {
        runner.setConfig({ enabled: true });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
        expect(result.violations).toEqual([]);
      });

      it("passes with empty rules array", async () => {
        runner.setConfig({ enabled: true, rules: [] });
        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });
    });

    describe("file name validation", () => {
      it("passes for kebab-case TypeScript files", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" }],
        });

        fs.mkdirSync(path.join(tempDir, "src"));
        fs.writeFileSync(path.join(tempDir, "src", "my-component.ts"), "");
        fs.writeFileSync(path.join(tempDir, "src", "utils.ts"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
        expect(result.violations).toEqual([]);
      });

      it("fails for PascalCase when kebab-case expected", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" }],
        });

        fs.mkdirSync(path.join(tempDir, "src"));
        fs.writeFileSync(path.join(tempDir, "src", "MyComponent.ts"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("MyComponent");
        expect(result.violations[0].message).toContain("kebab-case");
        expect(result.violations[0].code).toBe("file-case");
      });

      it("passes for numeric filenames like 404.tsx (Next.js pages)", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["tsx"], file_case: "kebab-case", folder_case: "kebab-case" }],
        });

        fs.mkdirSync(path.join(tempDir, "pages"));
        fs.writeFileSync(path.join(tempDir, "pages", "404.tsx"), "");
        fs.writeFileSync(path.join(tempDir, "pages", "500.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
        expect(result.violations).toEqual([]);
      });

      it("passes for snake_case Python files", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["py"], file_case: "snake_case", folder_case: "snake_case" }],
        });

        fs.mkdirSync(path.join(tempDir, "src"));
        fs.writeFileSync(path.join(tempDir, "src", "my_module.py"), "");
        fs.writeFileSync(path.join(tempDir, "src", "utils.py"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("fails for kebab-case when snake_case expected", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["py"], file_case: "snake_case", folder_case: "snake_case" }],
        });

        fs.mkdirSync(path.join(tempDir, "src"));
        fs.writeFileSync(path.join(tempDir, "src", "my-module.py"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations[0].message).toContain("my-module");
        expect(result.violations[0].message).toContain("snake_case");
      });

      it("passes for PascalCase files", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["tsx"], file_case: "PascalCase", folder_case: "kebab-case" }],
        });

        fs.mkdirSync(path.join(tempDir, "src"));
        fs.writeFileSync(path.join(tempDir, "src", "MyComponent.tsx"), "");
        fs.writeFileSync(path.join(tempDir, "src", "Button.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("passes for camelCase files", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["js"], file_case: "camelCase", folder_case: "camelCase" }],
        });

        fs.mkdirSync(path.join(tempDir, "src"));
        fs.writeFileSync(path.join(tempDir, "src", "myHelper.js"), "");
        fs.writeFileSync(path.join(tempDir, "src", "utils.js"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });
    });

    describe("folder name validation", () => {
      it("passes for kebab-case folders", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" }],
        });

        fs.mkdirSync(path.join(tempDir, "my-component"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "my-component", "index.ts"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("fails for PascalCase folder when kebab-case expected", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" }],
        });

        fs.mkdirSync(path.join(tempDir, "MyComponent"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "MyComponent", "index.ts"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.message.includes("MyComponent"))).toBe(true);
        expect(result.violations.some((v) => v.code === "folder-case")).toBe(true);
      });

      it("passes for snake_case Python folders", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["py"], file_case: "snake_case", folder_case: "snake_case" }],
        });

        fs.mkdirSync(path.join(tempDir, "my_module"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "my_module", "__init__.py"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("checks nested folder names", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" }],
        });

        fs.mkdirSync(path.join(tempDir, "src", "MyComponent"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "src", "MyComponent", "index.ts"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.message.includes("MyComponent"))).toBe(true);
      });
    });

    describe("multiple extensions", () => {
      it("handles multiple extensions in one rule", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            { extensions: ["ts", "tsx"], file_case: "kebab-case", folder_case: "kebab-case" },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "src"));
        fs.writeFileSync(path.join(tempDir, "src", "component.ts"), "");
        fs.writeFileSync(path.join(tempDir, "src", "component.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });
    });

    describe("multiple rules", () => {
      it("applies different rules to different extensions", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            { extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" },
            { extensions: ["py"], file_case: "snake_case", folder_case: "snake_case" },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "ts-src"));
        fs.mkdirSync(path.join(tempDir, "py_src"));
        fs.writeFileSync(path.join(tempDir, "ts-src", "my-file.ts"), "");
        fs.writeFileSync(path.join(tempDir, "py_src", "my_file.py"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("reports violations from multiple rules", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            { extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" },
            { extensions: ["py"], file_case: "snake_case", folder_case: "snake_case" },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "src"));
        fs.writeFileSync(path.join(tempDir, "src", "MyFile.ts"), ""); // Wrong
        fs.writeFileSync(path.join(tempDir, "src", "my-file.py"), ""); // Wrong

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe("exclusions", () => {
      it("excludes node_modules by default", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" }],
        });

        fs.mkdirSync(path.join(tempDir, "node_modules", "some-package"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "node_modules", "some-package", "BadName.ts"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("excludes dist by default", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" }],
        });

        fs.mkdirSync(path.join(tempDir, "dist"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "dist", "BadName.ts"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });
    });

    describe("allow_dynamic_routes", () => {
      it("fails for [id] folder when allow_dynamic_routes is not set", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["tsx"], file_case: "kebab-case", folder_case: "kebab-case" }],
        });

        fs.mkdirSync(path.join(tempDir, "app", "[id]"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "app", "[id]", "page.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.message.includes("[id]"))).toBe(true);
      });

      it("passes for [id] folder when allow_dynamic_routes is true", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            {
              extensions: ["tsx"],
              file_case: "kebab-case",
              folder_case: "kebab-case",
              allow_dynamic_routes: true,
            },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "app", "[id]"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "app", "[id]", "page.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("passes for kebab-case inside brackets [my-slug]", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            {
              extensions: ["tsx"],
              file_case: "kebab-case",
              folder_case: "kebab-case",
              allow_dynamic_routes: true,
            },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "app", "[my-slug]"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "app", "[my-slug]", "page.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("fails for PascalCase inside brackets [MySlug]", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            {
              extensions: ["tsx"],
              file_case: "kebab-case",
              folder_case: "kebab-case",
              allow_dynamic_routes: true,
            },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "app", "[MySlug]"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "app", "[MySlug]", "page.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.message.includes("[MySlug]"))).toBe(true);
      });

      it("passes for catch-all [...slug] folders", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            {
              extensions: ["tsx"],
              file_case: "kebab-case",
              folder_case: "kebab-case",
              allow_dynamic_routes: true,
            },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "app", "[...slug]"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "app", "[...slug]", "page.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("passes for optional catch-all [[...slug]] folders", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            {
              extensions: ["tsx"],
              file_case: "kebab-case",
              folder_case: "kebab-case",
              allow_dynamic_routes: true,
            },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "app", "[[...slug]]"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "app", "[[...slug]]", "page.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("passes for route group (auth) folders", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            {
              extensions: ["tsx"],
              file_case: "kebab-case",
              folder_case: "kebab-case",
              allow_dynamic_routes: true,
            },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "app", "(auth)"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "app", "(auth)", "page.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("passes for kebab-case inside route group (my-group)", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            {
              extensions: ["tsx"],
              file_case: "kebab-case",
              folder_case: "kebab-case",
              allow_dynamic_routes: true,
            },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "app", "(my-group)"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "app", "(my-group)", "page.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("passes for parallel routes @modal", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            {
              extensions: ["tsx"],
              file_case: "kebab-case",
              folder_case: "kebab-case",
              allow_dynamic_routes: true,
            },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "app", "@modal"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "app", "@modal", "page.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("validates inner content of parallel route @my-modal", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            {
              extensions: ["tsx"],
              file_case: "kebab-case",
              folder_case: "kebab-case",
              allow_dynamic_routes: true,
            },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "app", "@my-modal"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "app", "@my-modal", "page.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("fails for PascalCase inside parallel route @MyModal", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            {
              extensions: ["tsx"],
              file_case: "kebab-case",
              folder_case: "kebab-case",
              allow_dynamic_routes: true,
            },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "app", "@MyModal"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "app", "@MyModal", "page.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.message.includes("@MyModal"))).toBe(true);
      });

      it("handles nested dynamic routes", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            {
              extensions: ["tsx"],
              file_case: "kebab-case",
              folder_case: "kebab-case",
              allow_dynamic_routes: true,
            },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "app", "(dashboard)", "[team-id]", "settings"), {
          recursive: true,
        });
        fs.writeFileSync(
          path.join(tempDir, "app", "(dashboard)", "[team-id]", "settings", "page.tsx"),
          ""
        );

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("still validates regular folders alongside dynamic routes", async () => {
        runner.setConfig({
          enabled: true,
          rules: [
            {
              extensions: ["tsx"],
              file_case: "kebab-case",
              folder_case: "kebab-case",
              allow_dynamic_routes: true,
            },
          ],
        });

        fs.mkdirSync(path.join(tempDir, "app", "BadFolder", "[id]"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, "app", "BadFolder", "[id]", "page.tsx"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(false);
        expect(result.violations.some((v) => v.message.includes("BadFolder"))).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("handles single-word file names", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" }],
        });

        fs.mkdirSync(path.join(tempDir, "src"));
        fs.writeFileSync(path.join(tempDir, "src", "index.ts"), "");
        fs.writeFileSync(path.join(tempDir, "src", "utils.ts"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("handles files with multiple extensions", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" }],
        });

        fs.mkdirSync(path.join(tempDir, "src"));
        fs.writeFileSync(path.join(tempDir, "src", "my-component.test.ts"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("skips files with empty base name", async () => {
        runner.setConfig({
          enabled: true,
          rules: [{ extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" }],
        });

        // Files starting with . like .eslintrc.ts
        fs.mkdirSync(path.join(tempDir, "src"));
        fs.writeFileSync(path.join(tempDir, ".config.ts"), "");

        const result = await runner.run(tempDir);

        expect(result.passed).toBe(true);
      });

      it("includes duration in result", async () => {
        runner.setConfig({ enabled: true, rules: [] });
        const result = await runner.run(tempDir);

        expect(result.duration).toBeDefined();
        expect(typeof result.duration).toBe("number");
      });
    });
  });

  describe("audit", () => {
    it("passes when config is valid", async () => {
      runner.setConfig({
        enabled: true,
        rules: [{ extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" }],
      });

      const result = await runner.audit(tempDir);

      expect(result.name).toBe("Naming Config");
      expect(result.passed).toBe(true);
    });

    it("passes with no rules", async () => {
      runner.setConfig({ enabled: true });

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("fails when rule has no extensions", async () => {
      runner.setConfig({
        enabled: true,
        rules: [{ extensions: [], file_case: "kebab-case", folder_case: "kebab-case" }],
      });

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("at least one extension");
    });
  });
});

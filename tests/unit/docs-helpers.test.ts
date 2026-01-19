import { describe, expect, it } from "vitest";

import {
  escapeRegex,
  extractFileExports,
  getTrackedPath,
  parseMarkdownFile,
} from "../../src/process/tools/docs-helpers.js";

describe("docs-helpers", () => {
  describe("escapeRegex", () => {
    it("escapes special regex characters", () => {
      expect(escapeRegex("hello.world")).toBe("hello\\.world");
      expect(escapeRegex("test*pattern")).toBe("test\\*pattern");
      expect(escapeRegex("a+b")).toBe("a\\+b");
      expect(escapeRegex("a?b")).toBe("a\\?b");
      expect(escapeRegex("a^b")).toBe("a\\^b");
      expect(escapeRegex("a$b")).toBe("a\\$b");
      expect(escapeRegex("a{b}")).toBe("a\\{b\\}");
      expect(escapeRegex("a(b)")).toBe("a\\(b\\)");
      expect(escapeRegex("a|b")).toBe("a\\|b");
      expect(escapeRegex("a[b]")).toBe("a\\[b\\]");
      expect(escapeRegex("a\\b")).toBe("a\\\\b");
    });

    it("escapes multiple special characters", () => {
      expect(escapeRegex("[test].*.ts")).toBe("\\[test\\]\\.\\*\\.ts");
    });

    it("leaves normal characters unchanged", () => {
      expect(escapeRegex("hello")).toBe("hello");
      expect(escapeRegex("hello-world")).toBe("hello-world");
      expect(escapeRegex("hello_world")).toBe("hello_world");
      expect(escapeRegex("hello123")).toBe("hello123");
    });

    it("handles empty string", () => {
      expect(escapeRegex("")).toBe("");
    });
  });

  describe("parseMarkdownFile", () => {
    it("extracts frontmatter data", () => {
      const content = `---
title: Test Document
author: John Doe
tags:
  - test
  - example
---

# Content starts here
`;
      const result = parseMarkdownFile(content, "test.md");

      expect(result.filePath).toBe("test.md");
      expect(result.frontmatter.title).toBe("Test Document");
      expect(result.frontmatter.author).toBe("John Doe");
      expect(result.frontmatter.tags).toEqual(["test", "example"]);
    });

    it("extracts content without frontmatter", () => {
      const content = `---
title: Test
---

# Main Heading

Some text here.

## Subheading

More text.`;
      const result = parseMarkdownFile(content, "test.md");

      expect(result.content).toContain("# Main Heading");
      expect(result.content).toContain("Some text here.");
      expect(result.content).not.toContain("title: Test");
    });

    it("extracts headings from content", () => {
      const content = `---
title: Test
---

# First Heading

Some text.

## Second Heading

More text.

### Third Heading

Even more text.

# Another First Level

Final text.`;
      const result = parseMarkdownFile(content, "test.md");

      expect(result.headings).toEqual([
        "First Heading",
        "Second Heading",
        "Third Heading",
        "Another First Level",
      ]);
    });

    it("handles files without frontmatter", () => {
      const content = `# Just Content

No frontmatter here.`;
      const result = parseMarkdownFile(content, "test.md");

      expect(result.frontmatter).toEqual({});
      expect(result.headings).toEqual(["Just Content"]);
    });

    it("handles empty files", () => {
      const result = parseMarkdownFile("", "empty.md");

      expect(result.filePath).toBe("empty.md");
      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe("");
      expect(result.headings).toEqual([]);
    });

    it("handles files with only frontmatter", () => {
      const content = `---
title: Only Frontmatter
---
`;
      const result = parseMarkdownFile(content, "test.md");

      expect(result.frontmatter.title).toBe("Only Frontmatter");
      expect(result.headings).toEqual([]);
    });

    it("handles headings with various levels", () => {
      const content = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;
      const result = parseMarkdownFile(content, "test.md");

      expect(result.headings).toEqual(["H1", "H2", "H3", "H4", "H5", "H6"]);
    });

    it("ignores non-heading lines starting with hash", () => {
      const content = `# Real Heading

This line has a #hashtag in it.

##NotAHeading because no space

# Another Real Heading`;
      const result = parseMarkdownFile(content, "test.md");

      expect(result.headings).toEqual(["Real Heading", "Another Real Heading"]);
    });
  });

  describe("extractFileExports", () => {
    describe("named exports", () => {
      it("extracts const exports", () => {
        const content = `export const FOO = "bar";
export const BAZ = 123;`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(2);
        expect(exports[0]).toEqual({ name: "FOO", file: "test.ts", line: 1 });
        expect(exports[1]).toEqual({ name: "BAZ", file: "test.ts", line: 2 });
      });

      it("extracts let exports", () => {
        const content = `export let counter = 0;`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(1);
        expect(exports[0].name).toBe("counter");
      });

      it("extracts var exports", () => {
        const content = `export var legacy = true;`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(1);
        expect(exports[0].name).toBe("legacy");
      });

      it("extracts function exports", () => {
        const content = `export function doSomething() {
  return true;
}
export function anotherFunction(arg: string) {}`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(2);
        expect(exports[0]).toEqual({ name: "doSomething", file: "test.ts", line: 1 });
        expect(exports[1]).toEqual({ name: "anotherFunction", file: "test.ts", line: 4 });
      });

      it("extracts class exports", () => {
        const content = `export class MyClass {
  constructor() {}
}`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(1);
        expect(exports[0].name).toBe("MyClass");
      });

      it("extracts interface exports", () => {
        const content = `export interface MyInterface {
  name: string;
}`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(1);
        expect(exports[0].name).toBe("MyInterface");
      });

      it("extracts type exports", () => {
        const content = `export type MyType = string | number;`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(1);
        expect(exports[0].name).toBe("MyType");
      });

      it("extracts enum exports", () => {
        const content = `export enum Status {
  Active,
  Inactive
}`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(1);
        expect(exports[0].name).toBe("Status");
      });
    });

    describe("default exports", () => {
      it("extracts default export by name", () => {
        const content = `const config = { foo: "bar" };
export default config;`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(1);
        expect(exports[0]).toEqual({ name: "config", file: "test.ts", line: 2 });
      });

      it("ignores anonymous default function", () => {
        const content = `export default function() {
  return true;
}`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(0);
      });

      it("ignores anonymous default async function", () => {
        const content = `export default async function() {
  return true;
}`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(0);
      });

      it("ignores anonymous default class", () => {
        const content = `export default class {
  constructor() {}
}`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(0);
      });
    });

    describe("re-exports", () => {
      it("extracts re-exported names", () => {
        const content = `export { foo, bar, baz } from "./other";`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(3);
        expect(exports.map((e) => e.name)).toEqual(["foo", "bar", "baz"]);
      });

      it("handles aliased re-exports", () => {
        const content = `export { foo as myFoo, bar as myBar } from "./other";`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(2);
        expect(exports[0].name).toBe("myFoo");
        expect(exports[1].name).toBe("myBar");
      });

      it("handles multiple re-exports per line", () => {
        const content = `export { a, b as c, d } from "./module";`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(3);
        expect(exports.map((e) => e.name)).toEqual(["a", "c", "d"]);
      });

      it("handles re-exports without from clause", () => {
        const content = `const foo = 1;
const bar = 2;
export { foo, bar };`;
        const exports = extractFileExports("test.ts", content);

        expect(exports).toHaveLength(2);
        expect(exports[0]).toEqual({ name: "foo", file: "test.ts", line: 3 });
        expect(exports[1]).toEqual({ name: "bar", file: "test.ts", line: 3 });
      });
    });

    it("returns correct line numbers", () => {
      const content = `// Line 1 comment
// Line 2 comment
export const first = 1;
// Line 4 comment
export function second() {}
// Line 6 comment
// Line 7 comment
export class Third {}`;
      const exports = extractFileExports("test.ts", content);

      expect(exports).toHaveLength(3);
      expect(exports[0]).toEqual({ name: "first", file: "test.ts", line: 3 });
      expect(exports[1]).toEqual({ name: "second", file: "test.ts", line: 5 });
      expect(exports[2]).toEqual({ name: "Third", file: "test.ts", line: 8 });
    });

    it("handles mixed export types", () => {
      const content = `export const config = {};
export function helper() {}
export class Utility {}
export interface Options {}
export type Callback = () => void;
const defaultExport = {};
export default defaultExport;
export { foo, bar as baz } from "./other";`;
      const exports = extractFileExports("test.ts", content);

      expect(exports).toHaveLength(8);
      expect(exports.map((e) => e.name)).toEqual([
        "config",
        "helper",
        "Utility",
        "Options",
        "Callback",
        "defaultExport",
        "foo",
        "baz",
      ]);
    });

    it("handles files with no exports", () => {
      const content = `const privateVar = "private";
function privateFunc() {}
class PrivateClass {}`;
      const exports = extractFileExports("test.ts", content);

      expect(exports).toHaveLength(0);
    });

    it("handles empty file", () => {
      const exports = extractFileExports("test.ts", "");
      expect(exports).toHaveLength(0);
    });
  });

  describe("getTrackedPath", () => {
    const docsPath = "docs/";
    const emptyStaleMappings: Record<string, string> = {};

    it("uses frontmatter.tracks string", () => {
      const frontmatter = { tracks: "src/utils/helpers.ts" };
      const result = getTrackedPath("docs/helpers.md", frontmatter, emptyStaleMappings, docsPath);

      expect(result).toBe("src/utils/helpers.ts");
    });

    it("uses first element of tracks array", () => {
      const frontmatter = { tracks: ["src/primary.ts", "src/secondary.ts"] };
      const result = getTrackedPath("docs/api.md", frontmatter, emptyStaleMappings, docsPath);

      expect(result).toBe("src/primary.ts");
    });

    it("uses stale_mappings config", () => {
      const staleMappings = {
        "docs/config.md": "src/config/index.ts",
        "docs/other.md": "src/other/",
      };
      const result = getTrackedPath("docs/config.md", {}, staleMappings, docsPath);

      expect(result).toBe("src/config/index.ts");
    });

    it("falls back to src/ convention", () => {
      const result = getTrackedPath("docs/utils.md", {}, emptyStaleMappings, docsPath);

      expect(result).toBe("src/utils/");
    });

    it("handles nested doc paths with src/ convention", () => {
      const result = getTrackedPath("docs/api/endpoints.md", {}, emptyStaleMappings, docsPath);

      expect(result).toBe("src/api/endpoints/");
    });

    it("returns null when no tracking found and path not in docs", () => {
      const result = getTrackedPath("other/file.md", {}, emptyStaleMappings, docsPath);

      expect(result).toBeNull();
    });

    it("prefers frontmatter.tracks over stale_mappings", () => {
      const frontmatter = { tracks: "src/preferred.ts" };
      const staleMappings = { "docs/test.md": "src/fallback.ts" };
      const result = getTrackedPath("docs/test.md", frontmatter, staleMappings, docsPath);

      expect(result).toBe("src/preferred.ts");
    });

    it("prefers stale_mappings over src/ convention", () => {
      const staleMappings = { "docs/custom.md": "lib/custom/" };
      const result = getTrackedPath("docs/custom.md", {}, staleMappings, docsPath);

      expect(result).toBe("lib/custom/");
    });

    it("handles empty tracks array", () => {
      const frontmatter = { tracks: [] };
      const result = getTrackedPath("docs/test.md", frontmatter, emptyStaleMappings, docsPath);

      // Should fall back to src/ convention
      expect(result).toBe("src/test/");
    });

    it("handles non-string frontmatter tracks", () => {
      const frontmatter = { tracks: 123 };
      const result = getTrackedPath("docs/test.md", frontmatter, emptyStaleMappings, docsPath);

      // Should fall back to src/ convention
      expect(result).toBe("src/test/");
    });

    it("handles different docs path", () => {
      const customDocsPath = "documentation/";
      const result = getTrackedPath("documentation/api.md", {}, emptyStaleMappings, customDocsPath);

      expect(result).toBe("src/api/");
    });
  });
});

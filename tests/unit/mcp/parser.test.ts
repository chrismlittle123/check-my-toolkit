import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseGuideline, loadGuideline, loadAllGuidelines, toListItems } from "../../../src/mcp/standards/parser.js";
import { StandardsError } from "../../../src/mcp/standards/fetcher.js";

describe("parser", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-parser-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("parseGuideline", () => {
    it("parses valid guideline with frontmatter", () => {
      const content = `---
id: auth
title: Authentication
category: security
priority: 1
tags: [typescript, python, auth]
---

## Authentication

Use the auth package.
`;

      const guideline = parseGuideline(content, "auth.md");

      expect(guideline.id).toBe("auth");
      expect(guideline.title).toBe("Authentication");
      expect(guideline.category).toBe("security");
      expect(guideline.priority).toBe(1);
      expect(guideline.tags).toEqual(["typescript", "python", "auth"]);
      expect(guideline.content).toContain("## Authentication");
    });

    it("throws on missing frontmatter", () => {
      const content = `# No frontmatter

Just some content.
`;

      expect(() => parseGuideline(content, "bad.md")).toThrow(StandardsError);
    });

    it("throws on invalid frontmatter", () => {
      const content = `---
id: test
title: Test
# missing category, priority, tags
---

Content
`;

      expect(() => parseGuideline(content, "bad.md")).toThrow(StandardsError);
    });
  });

  describe("loadGuideline", () => {
    it("loads an existing guideline", () => {
      const content = `---
id: test
title: Test Guideline
category: testing
priority: 5
tags: [test]
---

Test content.
`;
      fs.writeFileSync(path.join(tempDir, "test.md"), content);

      const guideline = loadGuideline(tempDir, "test");

      expect(guideline).not.toBeNull();
      expect(guideline!.id).toBe("test");
      expect(guideline!.title).toBe("Test Guideline");
    });

    it("returns null for non-existent guideline", () => {
      const guideline = loadGuideline(tempDir, "nonexistent");
      expect(guideline).toBeNull();
    });
  });

  describe("loadAllGuidelines", () => {
    it("loads all guidelines from directory", () => {
      const guideline1 = `---
id: one
title: First
category: cat1
priority: 1
tags: [a]
---
Content 1
`;
      const guideline2 = `---
id: two
title: Second
category: cat2
priority: 2
tags: [b]
---
Content 2
`;
      fs.writeFileSync(path.join(tempDir, "one.md"), guideline1);
      fs.writeFileSync(path.join(tempDir, "two.md"), guideline2);

      const guidelines = loadAllGuidelines(tempDir);

      expect(guidelines).toHaveLength(2);
      expect(guidelines.map((g) => g.id).sort()).toEqual(["one", "two"]);
    });

    it("skips non-markdown files", () => {
      const guideline = `---
id: valid
title: Valid
category: cat
priority: 1
tags: [tag]
---
Content
`;
      fs.writeFileSync(path.join(tempDir, "valid.md"), guideline);
      fs.writeFileSync(path.join(tempDir, "readme.txt"), "Not a guideline");

      const guidelines = loadAllGuidelines(tempDir);

      expect(guidelines).toHaveLength(1);
      expect(guidelines[0].id).toBe("valid");
    });

    it("throws if directory does not exist", () => {
      expect(() => loadAllGuidelines("/nonexistent/dir")).toThrow(StandardsError);
    });
  });

  describe("toListItems", () => {
    it("converts guidelines to list items", () => {
      const guidelines = [
        { id: "one", title: "First", category: "cat1", priority: 1, tags: ["a", "b"], content: "c" },
        { id: "two", title: "Second", category: "cat2", priority: 2, tags: ["c"], content: "d" },
      ];

      const items = toListItems(guidelines);

      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({ id: "one", title: "First", tags: ["a", "b"], category: "cat1" });
      expect(items[1]).toEqual({ id: "two", title: "Second", tags: ["c"], category: "cat2" });
    });
  });
});

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock glob before importing TestsRunner
vi.mock("glob", () => {
  const mockGlob = vi.fn();
  mockGlob.iterate = vi.fn();
  return { glob: mockGlob };
});

import { glob } from "glob";
import { TestsRunner } from "../../src/code/tools/tests.js";

const mockedGlob = vi.mocked(glob);

describe("TestsRunner error handling", () => {
  let tempDir: string;
  let runner: TestsRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-tests-error-test-"));
    runner = new TestsRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("run error handling", () => {
    it("handles glob errors gracefully with Error object", async () => {
      mockedGlob.mockRejectedValueOnce(new Error("Permission denied"));

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("Tests validation error");
      expect(result.violations[0].message).toContain("Permission denied");
      expect(result.violations[0].rule).toBe("code.tests.tests");
      expect(result.violations[0].tool).toBe("tests");
      expect(result.violations[0].severity).toBe("error");
    });

    it("handles non-Error thrown objects in run", async () => {
      mockedGlob.mockRejectedValueOnce("string error");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Tests validation error");
      expect(result.violations[0].message).toContain("Unknown error");
    });

    it("includes duration even when error occurs", async () => {
      mockedGlob.mockRejectedValueOnce(new Error("Some error"));

      const result = await runner.run(tempDir);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });
  });

  describe("audit error handling", () => {
    it("handles glob.iterate errors gracefully", async () => {
      (mockedGlob.iterate as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error("Invalid pattern syntax");
      });

      runner.setConfig({ pattern: "[invalid" });
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("Invalid test pattern");
      expect(result.violations[0].message).toContain("[invalid");
      expect(result.violations[0].tool).toBe("audit");
      expect(result.violations[0].severity).toBe("error");
    });

    it("handles non-Error thrown objects in audit", async () => {
      (mockedGlob.iterate as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw "string error";
      });

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Unknown error");
    });

    it("includes pattern in error message", async () => {
      (mockedGlob.iterate as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error("Bad pattern");
      });

      runner.setConfig({ pattern: "custom/**/*.test.js" });
      const result = await runner.audit(tempDir);

      expect(result.violations[0].message).toContain("custom/**/*.test.js");
    });

    it("includes duration even when error occurs in audit", async () => {
      (mockedGlob.iterate as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error("Some error");
      });

      const result = await runner.audit(tempDir);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });

    it("returns correct name in audit error result", async () => {
      (mockedGlob.iterate as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error("Pattern error");
      });

      const result = await runner.audit(tempDir);

      expect(result.name).toBe("Tests Config");
      expect(result.rule).toBe("code.tests");
      expect(result.skipped).toBe(false);
    });
  });
});

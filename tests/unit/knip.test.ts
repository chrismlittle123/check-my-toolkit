import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KnipRunner } from "../../src/code/tools/knip.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("KnipRunner", () => {
  let tempDir: string;
  let runner: KnipRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-knip-test-"));
    runner = new KnipRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Knip");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.unused");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("knip");
    });

    it("has correct config files", () => {
      expect(runner.configFiles).toContain("knip.json");
      expect(runner.configFiles).toContain("knip.jsonc");
      expect(runner.configFiles).toContain("knip.js");
      expect(runner.configFiles).toContain("knip.ts");
      expect(runner.configFiles).toContain("knip.config.js");
      expect(runner.configFiles).toContain("knip.config.ts");
    });
  });

  describe("run", () => {
    it("runs knip and passes when no issues found", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({ files: [], issues: [] }),
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "npx",
        ["knip", "--reporter", "json"],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("detects unused files", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          files: ["unused-file.ts", "another-unused.ts"],
          issues: [],
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);

      expect(result.violations[0]).toMatchObject({
        rule: "code.unused.knip",
        tool: "knip",
        file: "unused-file.ts",
        message: "Unused file",
        code: "unused-file",
        severity: "warning",
      });

      expect(result.violations[1]).toMatchObject({
        file: "another-unused.ts",
        code: "unused-file",
      });
    });

    it("detects unused dependencies", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          files: [],
          issues: [
            {
              file: "package.json",
              dependencies: [
                { name: "lodash", line: 5, col: 6 },
                { name: "moment", line: 6, col: 6 },
              ],
              devDependencies: [],
              exports: [],
              types: [],
            },
          ],
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);

      expect(result.violations[0]).toMatchObject({
        rule: "code.unused.knip",
        tool: "knip",
        file: "package.json",
        line: 5,
        column: 6,
        message: "Unused dependency: lodash",
        code: "unused-dependency",
        severity: "warning",
      });

      expect(result.violations[1]).toMatchObject({
        message: "Unused dependency: moment",
        code: "unused-dependency",
      });
    });

    it("detects unused devDependencies", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          files: [],
          issues: [
            {
              file: "package.json",
              dependencies: [],
              devDependencies: [{ name: "@types/jest", line: 10, col: 6 }],
              exports: [],
              types: [],
            },
          ],
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0]).toMatchObject({
        message: "Unused devDependency: @types/jest",
        code: "unused-devDependency",
        severity: "warning",
      });
    });

    it("detects unlisted dependencies with error severity", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          files: [],
          issues: [
            {
              file: "src/index.ts",
              dependencies: [],
              devDependencies: [],
              unlisted: [{ name: "missing-pkg", line: 3, col: 1 }],
              exports: [],
              types: [],
            },
          ],
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0]).toMatchObject({
        message: "Unlisted dependency: missing-pkg",
        code: "unlisted-dependency",
        severity: "error",
      });
    });

    it("detects unresolved imports with error severity", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          files: [],
          issues: [
            {
              file: "src/index.ts",
              dependencies: [],
              devDependencies: [],
              unresolved: [{ name: "./missing-module", line: 5, col: 1 }],
              exports: [],
              types: [],
            },
          ],
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0]).toMatchObject({
        message: "Unresolved import: ./missing-module",
        code: "unresolved-import",
        severity: "error",
      });
    });

    it("detects unused exports", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          files: [],
          issues: [
            {
              file: "src/utils.ts",
              dependencies: [],
              devDependencies: [],
              exports: [
                { name: "unusedFunction", line: 10, col: 1 },
                { name: "anotherUnused", line: 20, col: 1 },
              ],
              types: [],
            },
          ],
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations).toHaveLength(2);

      expect(result.violations[0]).toMatchObject({
        file: "src/utils.ts",
        line: 10,
        message: "Unused export: unusedFunction",
        code: "unused-export",
        severity: "warning",
      });
    });

    it("detects unused types", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          files: [],
          issues: [
            {
              file: "src/types.ts",
              dependencies: [],
              devDependencies: [],
              exports: [],
              types: [{ name: "UnusedInterface", line: 5, col: 1 }],
            },
          ],
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0]).toMatchObject({
        message: "Unused type: UnusedInterface",
        code: "unused-type",
        severity: "warning",
      });
    });

    it("detects duplicate exports", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          files: [],
          issues: [
            {
              file: "src/index.ts",
              dependencies: [],
              devDependencies: [],
              exports: [],
              types: [],
              duplicates: [{ name: "duplicatedExport", line: 15, col: 1 }],
            },
          ],
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0]).toMatchObject({
        message: "Duplicate export: duplicatedExport",
        code: "duplicate-export",
        severity: "warning",
      });
    });

    it("handles multiple issue types in same file", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          files: ["orphan.ts"],
          issues: [
            {
              file: "package.json",
              dependencies: [{ name: "lodash", line: 5, col: 6 }],
              devDependencies: [],
              exports: [],
              types: [],
            },
            {
              file: "src/index.ts",
              dependencies: [],
              devDependencies: [],
              exports: [{ name: "unusedFn", line: 10, col: 1 }],
              types: [{ name: "UnusedType", line: 20, col: 1 }],
            },
          ],
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations).toHaveLength(4);
      expect(result.violations.map((v) => v.code)).toEqual([
        "unused-file",
        "unused-dependency",
        "unused-export",
        "unused-type",
      ]);
    });

    it("handles knip error with stderr", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "ERROR: Unable to find package.json",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Knip error");
      expect(result.violations[0].message).toContain("Unable to find package.json");
    });

    it("handles invalid JSON output", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "not valid json",
        stderr: "some error",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Knip error");
    });

    it("skips when knip not installed", async () => {
      const error = new Error("spawn npx ENOENT");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("Knip not installed");
    });

    it("fails with error message for other errors", async () => {
      const error = new Error("Some unexpected error");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Knip error");
      expect(result.violations[0].message).toContain("Some unexpected error");
    });

    it("handles non-Error thrown objects", async () => {
      mockedExeca.mockRejectedValueOnce("string error");

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Unknown error");
    });

    it("includes duration in result", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({ files: [], issues: [] }),
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });

    it("handles empty arrays gracefully", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          files: [],
          issues: [
            {
              file: "src/index.ts",
              dependencies: [],
              devDependencies: [],
              optionalPeerDependencies: [],
              unlisted: [],
              binaries: [],
              unresolved: [],
              exports: [],
              types: [],
              enumMembers: {},
              duplicates: [],
            },
          ],
        }),
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });
  });

  describe("audit", () => {
    it("passes when package.json exists", async () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
      const result = await runner.audit(tempDir);

      expect(result.name).toBe("Knip");
      expect(result.passed).toBe(true);
    });

    it("fails when package.json missing", async () => {
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("package.json not found");
    });

    it("includes duration in audit result", async () => {
      fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
      const result = await runner.audit(tempDir);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });
  });
});

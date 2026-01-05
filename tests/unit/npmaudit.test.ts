import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NpmAuditRunner } from "../../src/code/tools/npmaudit.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("NpmAuditRunner", () => {
  let tempDir: string;
  let runner: NpmAuditRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-npmaudit-test-"));
    runner = new NpmAuditRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("npmaudit");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.security");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("npmaudit");
    });

    it("has correct config files", () => {
      expect(runner.configFiles).toContain("package-lock.json");
    });
  });

  describe("run", () => {
    it("skips when no package-lock.json exists", async () => {
      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("runs npm audit and passes when no vulnerabilities found", async () => {
      // Create package-lock.json
      fs.writeFileSync(path.join(tempDir, "package-lock.json"), "{}");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          vulnerabilities: {},
          metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } },
        }),
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "npm",
        ["audit", "--json"],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("detects critical vulnerability", async () => {
      fs.writeFileSync(path.join(tempDir, "package-lock.json"), "{}");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          vulnerabilities: {
            "vulnerable-pkg": {
              name: "vulnerable-pkg",
              severity: "critical",
              isDirect: false,
              via: [{ name: "vuln", title: "Remote Code Execution", url: "https://example.com" }],
              effects: [],
              range: ">=1.0.0",
              nodes: ["node_modules/vulnerable-pkg"],
              fixAvailable: { name: "vulnerable-pkg", version: "2.0.0", isSemVerMajor: true },
            },
          },
          metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 1, total: 1 } },
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toMatchObject({
        rule: "code.security.npmaudit",
        tool: "npmaudit",
        file: "package-lock.json",
        code: "critical",
        severity: "error",
      });
      expect(result.violations[0].message).toContain("vulnerable-pkg");
      expect(result.violations[0].message).toContain("Remote Code Execution");
    });

    it("detects high severity vulnerability as error", async () => {
      fs.writeFileSync(path.join(tempDir, "package-lock.json"), "{}");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          vulnerabilities: {
            "high-vuln": {
              name: "high-vuln",
              severity: "high",
              isDirect: true,
              via: ["dependency"],
              effects: [],
              range: "*",
              nodes: [],
              fixAvailable: false,
            },
          },
          metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0, total: 1 } },
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].severity).toBe("error");
      expect(result.violations[0].message).toContain("no fix available");
    });

    it("detects moderate severity vulnerability as warning", async () => {
      fs.writeFileSync(path.join(tempDir, "package-lock.json"), "{}");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          vulnerabilities: {
            "moderate-vuln": {
              name: "moderate-vuln",
              severity: "moderate",
              isDirect: false,
              via: ["dep"],
              effects: [],
              range: "*",
              nodes: [],
              fixAvailable: { name: "moderate-vuln", version: "1.0.1", isSemVerMajor: false },
            },
          },
          metadata: { vulnerabilities: { info: 0, low: 0, moderate: 1, high: 0, critical: 0, total: 1 } },
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].severity).toBe("warning");
      expect(result.violations[0].message).toContain("fix: 1.0.1");
    });

    it("detects low severity vulnerability as warning", async () => {
      fs.writeFileSync(path.join(tempDir, "package-lock.json"), "{}");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          vulnerabilities: {
            "low-vuln": {
              name: "low-vuln",
              severity: "low",
              isDirect: false,
              via: ["dep"],
              effects: [],
              range: "*",
              nodes: [],
              fixAvailable: true,
            },
          },
          metadata: { vulnerabilities: { info: 0, low: 1, moderate: 0, high: 0, critical: 0, total: 1 } },
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0].severity).toBe("warning");
    });

    it("detects multiple vulnerabilities", async () => {
      fs.writeFileSync(path.join(tempDir, "package-lock.json"), "{}");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          vulnerabilities: {
            "pkg1": {
              name: "pkg1",
              severity: "critical",
              isDirect: false,
              via: [],
              effects: [],
              range: "*",
              nodes: [],
              fixAvailable: false,
            },
            "pkg2": {
              name: "pkg2",
              severity: "high",
              isDirect: false,
              via: [],
              effects: [],
              range: "*",
              nodes: [],
              fixAvailable: false,
            },
            "pkg3": {
              name: "pkg3",
              severity: "low",
              isDirect: false,
              via: [],
              effects: [],
              range: "*",
              nodes: [],
              fixAvailable: false,
            },
          },
          metadata: { vulnerabilities: { info: 0, low: 1, moderate: 0, high: 1, critical: 1, total: 3 } },
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(3);
    });

    it("handles npm audit error with stderr", async () => {
      fs.writeFileSync(path.join(tempDir, "package-lock.json"), "{}");

      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "npm ERR! something went wrong",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("npm audit error");
    });

    it("handles invalid JSON output", async () => {
      fs.writeFileSync(path.join(tempDir, "package-lock.json"), "{}");

      mockedExeca.mockResolvedValueOnce({
        stdout: "not valid json",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      // Should pass if exit code is 0 even with invalid JSON
      expect(result.passed).toBe(true);
    });

    it("skips when npm is not installed", async () => {
      fs.writeFileSync(path.join(tempDir, "package-lock.json"), "{}");

      mockedExeca.mockRejectedValueOnce(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" })
      );

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(true);
    });

    it("includes breaking fix indicator", async () => {
      fs.writeFileSync(path.join(tempDir, "package-lock.json"), "{}");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          vulnerabilities: {
            "breaking-fix": {
              name: "breaking-fix",
              severity: "high",
              isDirect: false,
              via: [{ title: "Security Issue" }],
              effects: [],
              range: "*",
              nodes: [],
              fixAvailable: { name: "breaking-fix", version: "2.0.0", isSemVerMajor: true },
            },
          },
          metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0, total: 1 } },
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0].message).toContain("(breaking)");
    });
  });

  describe("audit", () => {
    it("passes when package-lock.json exists", async () => {
      fs.writeFileSync(path.join(tempDir, "package-lock.json"), "{}");

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("fails when package-lock.json is missing", async () => {
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("package-lock.json not found");
    });
  });
});

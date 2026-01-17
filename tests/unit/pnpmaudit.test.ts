import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PnpmAuditRunner } from "../../src/code/tools/pnpmaudit.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("PnpmAuditRunner", () => {
  let tempDir: string;
  let runner: PnpmAuditRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-pnpmaudit-test-"));
    runner = new PnpmAuditRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("pnpmaudit");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.security");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("pnpmaudit");
    });

    it("has correct config files", () => {
      expect(runner.configFiles).toContain("pnpm-lock.yaml");
    });
  });

  describe("run", () => {
    it("fails when no pnpm-lock.yaml exists", async () => {
      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("No pnpm-lock.yaml found");
    });

    it("runs pnpm audit with --prod flag by default", async () => {
      fs.writeFileSync(path.join(tempDir, "pnpm-lock.yaml"), "lockfileVersion: 6.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          advisories: {},
          metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 } },
        }),
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "pnpm",
        ["audit", "--json", "--prod"],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("runs pnpm audit without --prod when exclude_dev is false", async () => {
      fs.writeFileSync(path.join(tempDir, "pnpm-lock.yaml"), "lockfileVersion: 6.0");

      runner.setConfig({ exclude_dev: false });

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          advisories: {},
          metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 } },
        }),
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "pnpm",
        ["audit", "--json"],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
    });

    it("detects critical vulnerability", async () => {
      fs.writeFileSync(path.join(tempDir, "pnpm-lock.yaml"), "lockfileVersion: 6.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          advisories: {
            "12345": {
              module_name: "vulnerable-pkg",
              severity: "critical",
              title: "Remote Code Execution",
              url: "https://example.com",
              findings: [{ version: "1.0.0", paths: ["node_modules/vulnerable-pkg"] }],
            },
          },
          metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 1 } },
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toMatchObject({
        rule: "code.security.pnpmaudit",
        tool: "pnpmaudit",
        file: "pnpm-lock.yaml",
        code: "critical",
        severity: "error",
      });
      expect(result.violations[0].message).toContain("vulnerable-pkg");
      expect(result.violations[0].message).toContain("Remote Code Execution");
    });

    it("detects high severity vulnerability as error", async () => {
      fs.writeFileSync(path.join(tempDir, "pnpm-lock.yaml"), "lockfileVersion: 6.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          advisories: {
            "12345": {
              module_name: "high-vuln",
              severity: "high",
              title: "Security Issue",
              url: "https://example.com",
              findings: [],
            },
          },
          metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 } },
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].severity).toBe("error");
    });

    it("detects moderate severity vulnerability as warning", async () => {
      fs.writeFileSync(path.join(tempDir, "pnpm-lock.yaml"), "lockfileVersion: 6.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          advisories: {
            "12345": {
              module_name: "moderate-vuln",
              severity: "moderate",
              title: "Minor Issue",
              url: "https://example.com",
              findings: [],
            },
          },
          metadata: { vulnerabilities: { info: 0, low: 0, moderate: 1, high: 0, critical: 0 } },
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].severity).toBe("warning");
    });

    it("detects low severity vulnerability as warning", async () => {
      fs.writeFileSync(path.join(tempDir, "pnpm-lock.yaml"), "lockfileVersion: 6.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          advisories: {
            "12345": {
              module_name: "low-vuln",
              severity: "low",
              title: "Info Issue",
              url: "https://example.com",
              findings: [],
            },
          },
          metadata: { vulnerabilities: { info: 0, low: 1, moderate: 0, high: 0, critical: 0 } },
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0].severity).toBe("warning");
    });

    it("detects multiple vulnerabilities", async () => {
      fs.writeFileSync(path.join(tempDir, "pnpm-lock.yaml"), "lockfileVersion: 6.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          advisories: {
            "1": {
              module_name: "pkg1",
              severity: "critical",
              title: "Issue 1",
              url: "",
              findings: [],
            },
            "2": {
              module_name: "pkg2",
              severity: "high",
              title: "Issue 2",
              url: "",
              findings: [],
            },
            "3": {
              module_name: "pkg3",
              severity: "low",
              title: "Issue 3",
              url: "",
              findings: [],
            },
          },
          metadata: { vulnerabilities: { info: 0, low: 1, moderate: 0, high: 1, critical: 1 } },
        }),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(3);
    });

    it("handles pnpm audit error with stderr", async () => {
      fs.writeFileSync(path.join(tempDir, "pnpm-lock.yaml"), "lockfileVersion: 6.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "ERR! something went wrong",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("pnpm audit error");
    });

    it("handles invalid JSON output", async () => {
      fs.writeFileSync(path.join(tempDir, "pnpm-lock.yaml"), "lockfileVersion: 6.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: "not valid json",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      // Should pass if exit code is 0 even with invalid JSON
      expect(result.passed).toBe(true);
    });

    it("skips when pnpm is not installed", async () => {
      fs.writeFileSync(path.join(tempDir, "pnpm-lock.yaml"), "lockfileVersion: 6.0");

      mockedExeca.mockRejectedValueOnce(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" })
      );

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(true);
    });

    it("passes when no advisories in output", async () => {
      fs.writeFileSync(path.join(tempDir, "pnpm-lock.yaml"), "lockfileVersion: 6.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify({
          metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 } },
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
    it("passes when pnpm-lock.yaml exists", async () => {
      fs.writeFileSync(path.join(tempDir, "pnpm-lock.yaml"), "lockfileVersion: 6.0");

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("fails when no pnpm-lock.yaml exists", async () => {
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("No pnpm-lock.yaml found");
    });
  });
});

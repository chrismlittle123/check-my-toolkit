import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PipAuditRunner } from "../../src/code/tools/pipaudit.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("PipAuditRunner", () => {
  let tempDir: string;
  let runner: PipAuditRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-pipaudit-test-"));
    runner = new PipAuditRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("pipaudit");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.security");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("pipaudit");
    });

    it("has correct config files", () => {
      expect(runner.configFiles).toContain("requirements.txt");
      expect(runner.configFiles).toContain("pyproject.toml");
    });
  });

  describe("run", () => {
    it("skips when no Python dependency file exists", async () => {
      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("runs pip-audit and passes when no vulnerabilities found", async () => {
      // Create requirements.txt
      fs.writeFileSync(path.join(tempDir, "requirements.txt"), "requests==2.28.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify([]),
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "uvx",
        ["pip-audit", "--format", "json", "-r", "requirements.txt"],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("detects vulnerability with fix available (error severity)", async () => {
      fs.writeFileSync(path.join(tempDir, "requirements.txt"), "requests==2.5.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify([
          {
            name: "requests",
            version: "2.5.0",
            vulns: [
              {
                id: "PYSEC-2021-123",
                fix_versions: ["2.6.0"],
                aliases: ["CVE-2021-12345"],
                description: "Security vulnerability in requests",
              },
            ],
          },
        ]),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toMatchObject({
        rule: "code.security.pipaudit",
        tool: "pipaudit",
        code: "PYSEC-2021-123",
        severity: "error", // Has fix available
      });
      expect(result.violations[0].message).toContain("requests@2.5.0");
      expect(result.violations[0].message).toContain("CVE-2021-12345");
      expect(result.violations[0].message).toContain("fix: 2.6.0");
    });

    it("detects vulnerability without fix available (warning severity)", async () => {
      fs.writeFileSync(path.join(tempDir, "requirements.txt"), "vulnerable-pkg==1.0.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify([
          {
            name: "vulnerable-pkg",
            version: "1.0.0",
            vulns: [
              {
                id: "PYSEC-2022-456",
                fix_versions: [],
                aliases: [],
                description: "No fix available yet",
              },
            ],
          },
        ]),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].severity).toBe("warning");
      expect(result.violations[0].message).toContain("no fix available");
    });

    it("detects multiple vulnerabilities in same package", async () => {
      fs.writeFileSync(path.join(tempDir, "requirements.txt"), "pkg==1.0.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify([
          {
            name: "pkg",
            version: "1.0.0",
            vulns: [
              { id: "PYSEC-2021-001", fix_versions: ["1.0.1"], aliases: ["CVE-2021-001"], description: "Vuln 1" },
              { id: "PYSEC-2021-002", fix_versions: [], aliases: ["CVE-2021-002"], description: "Vuln 2" },
            ],
          },
        ]),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
    });

    it("detects vulnerabilities in multiple packages", async () => {
      fs.writeFileSync(path.join(tempDir, "requirements.txt"), "pkg1==1.0.0\npkg2==2.0.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify([
          {
            name: "pkg1",
            version: "1.0.0",
            vulns: [{ id: "PYSEC-2021-001", fix_versions: ["1.0.1"], aliases: [], description: "Vuln 1" }],
          },
          {
            name: "pkg2",
            version: "2.0.0",
            vulns: [{ id: "PYSEC-2021-002", fix_versions: ["2.0.1"], aliases: [], description: "Vuln 2" }],
          },
        ]),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
    });

    it("works with pyproject.toml", async () => {
      fs.writeFileSync(path.join(tempDir, "pyproject.toml"), "[project]\nname = 'test'");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify([]),
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });

    it("works with setup.py", async () => {
      fs.writeFileSync(path.join(tempDir, "setup.py"), "from setuptools import setup");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify([]),
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
    });

    it("falls back to pip-audit when uvx fails", async () => {
      fs.writeFileSync(path.join(tempDir, "requirements.txt"), "requests==2.28.0");

      // First call (uvx) fails
      mockedExeca.mockRejectedValueOnce(new Error("uvx not found"));
      // Second call (pip-audit) succeeds
      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify([]),
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledTimes(2);
      expect(mockedExeca).toHaveBeenNthCalledWith(1, "uvx", ["pip-audit", "--format", "json", "-r", "requirements.txt"], expect.anything());
      expect(mockedExeca).toHaveBeenNthCalledWith(2, "pip-audit", ["--format", "json", "-r", "requirements.txt"], expect.anything());
      expect(result.passed).toBe(true);
    });

    it("handles pip-audit error with stderr", async () => {
      fs.writeFileSync(path.join(tempDir, "requirements.txt"), "requests==2.28.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "pip-audit error: something went wrong",
        exitCode: 2,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("pip-audit error");
    });

    it("handles invalid JSON output", async () => {
      fs.writeFileSync(path.join(tempDir, "requirements.txt"), "requests==2.28.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: "not valid json",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      // Should pass if exit code is 0 even with invalid JSON
      expect(result.passed).toBe(true);
    });

    it("skips when pip-audit is not installed", async () => {
      fs.writeFileSync(path.join(tempDir, "requirements.txt"), "requests==2.28.0");

      // Both uvx and pip-audit fail with ENOENT
      mockedExeca.mockRejectedValueOnce(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" })
      );
      mockedExeca.mockRejectedValueOnce(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" })
      );

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(true);
    });

    it("uses vulnerability ID when no CVE alias exists", async () => {
      fs.writeFileSync(path.join(tempDir, "requirements.txt"), "pkg==1.0.0");

      mockedExeca.mockResolvedValueOnce({
        stdout: JSON.stringify([
          {
            name: "pkg",
            version: "1.0.0",
            vulns: [
              { id: "GHSA-abc-123", fix_versions: ["1.0.1"], aliases: [], description: "Description" },
            ],
          },
        ]),
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.violations[0].message).toContain("GHSA-abc-123");
    });
  });

  describe("audit", () => {
    it("passes when requirements.txt exists", async () => {
      fs.writeFileSync(path.join(tempDir, "requirements.txt"), "requests==2.28.0");

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("passes when pyproject.toml exists", async () => {
      fs.writeFileSync(path.join(tempDir, "pyproject.toml"), "[project]");

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("passes when setup.py exists", async () => {
      fs.writeFileSync(path.join(tempDir, "setup.py"), "setup()");

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(true);
    });

    it("fails when no Python dependency file exists", async () => {
      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("No Python dependency file found");
    });
  });
});

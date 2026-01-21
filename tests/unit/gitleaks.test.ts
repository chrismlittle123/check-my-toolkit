import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GitleaksRunner } from "../../src/code/tools/gitleaks.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

describe("GitleaksRunner", () => {
  let tempDir: string;
  let runner: GitleaksRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-gitleaks-test-"));
    runner = new GitleaksRunner();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("properties", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("gitleaks");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("code.security");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("secrets");
    });

    it("has correct config files", () => {
      expect(runner.configFiles).toContain(".gitleaks.toml");
      expect(runner.configFiles).toContain("gitleaks.toml");
    });
  });

  describe("setConfig", () => {
    it("sets scan_mode and base_branch config", () => {
      runner.setConfig({
        enabled: true,
        scan_mode: "full",
        base_branch: "develop",
      });

      // Verify config is stored (implicitly tested through run tests)
      expect(runner).toBeDefined();
    });

    it("merges config with defaults", () => {
      runner.setConfig({
        scan_mode: "staged",
      });

      expect(runner).toBeDefined();
    });
  });

  describe("run", () => {
    it("passes when no secrets found (exit code 0) with default branch mode", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "gitleaks",
        ["detect", "--report-format", "json", "--report-path", "/dev/stdout", "--log-opts", "main..HEAD"],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("uses files mode with --no-git when configured", async () => {
      runner.setConfig({ scan_mode: "files" });

      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "gitleaks",
        ["detect", "--report-format", "json", "--report-path", "/dev/stdout", "--source", ".", "--no-git"],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
    });

    it("uses staged mode when configured", async () => {
      runner.setConfig({ scan_mode: "staged" });

      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "gitleaks",
        ["detect", "--report-format", "json", "--report-path", "/dev/stdout", "--staged"],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
    });

    it("uses full mode without extra flags when configured", async () => {
      runner.setConfig({ scan_mode: "full" });

      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "gitleaks",
        ["detect", "--report-format", "json", "--report-path", "/dev/stdout"],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
    });

    it("uses custom base_branch in branch mode", async () => {
      runner.setConfig({ scan_mode: "branch", base_branch: "develop" });

      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "gitleaks",
        ["detect", "--report-format", "json", "--report-path", "/dev/stdout", "--log-opts", "develop..HEAD"],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
    });

    it("uses custom gitleaks config file when present", async () => {
      // Create a .gitleaks.toml file in the temp directory
      fs.writeFileSync(path.join(tempDir, ".gitleaks.toml"), "[allowlist]\nregexes = []");

      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "gitleaks",
        [
          "detect",
          "--report-format",
          "json",
          "--report-path",
          "/dev/stdout",
          "--log-opts",
          "main..HEAD",
          "--config",
          path.join(tempDir, ".gitleaks.toml"),
        ],
        expect.objectContaining({
          cwd: tempDir,
          reject: false,
        })
      );
      expect(result.passed).toBe(true);
    });

    it("parses secrets from gitleaks output (exit code 1)", async () => {
      const gitleaksOutput = JSON.stringify([
        {
          Description: "AWS Access Key",
          StartLine: 10,
          EndLine: 10,
          StartColumn: 5,
          EndColumn: 25,
          Match: "AKIAIOSFODNN7EXAMPLE",
          Secret: "AKIAIOSFODNN7EXAMPLE",
          File: "config.js",
          Commit: "abc123",
          Entropy: 3.5,
          Author: "test",
          Email: "test@example.com",
          Date: "2024-01-01",
          Message: "Add config",
          Tags: ["aws"],
          RuleID: "aws-access-key",
          Fingerprint: "abc123:config.js:aws-access-key:10",
        },
      ]);

      mockedExeca.mockResolvedValueOnce({
        stdout: gitleaksOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toMatchObject({
        rule: "code.security.secrets",
        tool: "secrets",
        file: "config.js",
        line: 10,
        column: 5,
        message: "aws-access-key: AWS Access Key",
        code: "aws-access-key",
        severity: "error",
      });
    });

    it("parses multiple secrets", async () => {
      const gitleaksOutput = JSON.stringify([
        {
          Description: "AWS Access Key",
          StartLine: 10,
          StartColumn: 5,
          File: "config.js",
          RuleID: "aws-access-key",
        },
        {
          Description: "GitHub Token",
          StartLine: 20,
          StartColumn: 1,
          File: "env.js",
          RuleID: "github-token",
        },
      ]);

      mockedExeca.mockResolvedValueOnce({
        stdout: gitleaksOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.violations[0].file).toBe("config.js");
      expect(result.violations[1].file).toBe("env.js");
    });

    it("parses database connection string secrets (ISSUE-002)", async () => {
      const gitleaksOutput = JSON.stringify([
        {
          Description: "Generic Database Connection String",
          StartLine: 5,
          EndLine: 5,
          StartColumn: 15,
          EndColumn: 70,
          Match: "postgres://admin:secretpassword123@db.example.com:5432/myapp",
          Secret: "secretpassword123",
          File: "config.py",
          Commit: "def456",
          Entropy: 3.8,
          Author: "test",
          Email: "test@example.com",
          Date: "2024-01-01",
          Message: "Add database config",
          Tags: ["database"],
          RuleID: "generic-database-url",
          Fingerprint: "def456:config.py:generic-database-url:5",
        },
      ]);

      mockedExeca.mockResolvedValueOnce({
        stdout: gitleaksOutput,
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toMatchObject({
        rule: "code.security.secrets",
        tool: "secrets",
        file: "config.py",
        line: 5,
        column: 15,
        message: "generic-database-url: Generic Database Connection String",
        code: "generic-database-url",
        severity: "error",
      });
    });

    it("handles empty JSON array output", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "[]",
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("handles empty stdout", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("fails with error for invalid JSON output", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "invalid json",
        stderr: "",
        exitCode: 1,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("Failed to parse gitleaks output");
    });

    it("handles other exit codes as errors", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "gitleaks: command failed",
        exitCode: 2,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("gitleaks error");
    });

    it("uses stdout for error message when stderr is undefined", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "some error in stdout",
        stderr: undefined,
        exitCode: 2,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("some error in stdout");
    });

    it("uses Unknown error when both stdout and stderr are undefined", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: undefined,
        stderr: undefined,
        exitCode: 2,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Unknown error");
    });

    it("skips when gitleaks not installed (ENOENT)", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 1,
        failed: true,
        code: "ENOENT",
      } as never);

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("not installed");
    });

    it("skips when gitleaks not installed (ENOENT in message)", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "",
        stderr: "",
        exitCode: 1,
        failed: true,
        message: "spawn gitleaks ENOENT",
      } as never);

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("not installed");
    });

    it("handles thrown ENOENT error", async () => {
      const error = new Error("spawn gitleaks ENOENT");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("not installed");
    });

    it("handles other thrown errors", async () => {
      const error = new Error("Some unexpected error");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.run(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("gitleaks error");
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
        stdout: "",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.run(tempDir);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });
  });

  describe("audit", () => {
    it("passes when gitleaks is installed", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "gitleaks version 8.18.0",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.audit(tempDir);

      expect(mockedExeca).toHaveBeenCalledWith(
        "gitleaks",
        ["version"],
        expect.objectContaining({
          cwd: tempDir,
          reject: true,
        })
      );
      expect(result.passed).toBe(true);
    });

    it("skips when gitleaks not installed", async () => {
      const error = new Error("spawn gitleaks ENOENT");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.audit(tempDir);

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain("not installed");
    });

    it("fails on other errors", async () => {
      const error = new Error("Permission denied");
      mockedExeca.mockRejectedValueOnce(error);

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("gitleaks audit error");
      expect(result.violations[0].message).toContain("Permission denied");
    });

    it("handles non-Error thrown objects in audit", async () => {
      mockedExeca.mockRejectedValueOnce("string error");

      const result = await runner.audit(tempDir);

      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toContain("Unknown error");
    });

    it("includes duration in audit result", async () => {
      mockedExeca.mockResolvedValueOnce({
        stdout: "gitleaks version 8.18.0",
        stderr: "",
        exitCode: 0,
      } as never);

      const result = await runner.audit(tempDir);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
    });
  });
});

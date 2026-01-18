import { describe, expect, it } from "vitest";

import {
  CheckResult,
  DomainResult,
  ExitCode,
  Violation,
  type CheckResult as CheckResultType,
  type DomainResult as DomainResultType,
  type DomainStatus,
  type Severity,
  type Violation as ViolationType,
} from "../../src/types/index.js";

describe("Violation builder", () => {
  describe("create", () => {
    it("creates violation with all optional fields", () => {
      const violation = Violation.create({
        rule: "code.linting.eslint",
        tool: "eslint",
        message: "Test error",
        severity: "error",
        file: "src/index.ts",
        line: 10,
        column: 5,
        code: "no-var",
      });

      expect(violation).toEqual({
        rule: "code.linting.eslint",
        tool: "eslint",
        message: "Test error",
        severity: "error",
        file: "src/index.ts",
        line: 10,
        column: 5,
        code: "no-var",
      });
    });

    it("creates violation without optional fields", () => {
      const violation = Violation.create({
        rule: "code.linting.eslint",
        tool: "eslint",
        message: "Test error",
        severity: "error",
      });

      expect(violation).toEqual({
        rule: "code.linting.eslint",
        tool: "eslint",
        message: "Test error",
        severity: "error",
      });
      expect(violation.file).toBeUndefined();
      expect(violation.line).toBeUndefined();
      expect(violation.column).toBeUndefined();
      expect(violation.code).toBeUndefined();
    });

    it("excludes falsy optional fields", () => {
      const violation = Violation.create({
        rule: "code.linting.eslint",
        tool: "eslint",
        message: "Test error",
        severity: "error",
        file: "",
        line: 0,
        column: 0,
        code: "",
      });

      expect(violation.file).toBeUndefined();
      expect(violation.line).toBeUndefined();
      expect(violation.column).toBeUndefined();
      expect(violation.code).toBeUndefined();
    });
  });

  describe("error", () => {
    it("creates error violation with code", () => {
      const violation = Violation.error("code.linting", "eslint", "Error message", "no-var");

      expect(violation).toEqual({
        rule: "code.linting",
        tool: "eslint",
        message: "Error message",
        severity: "error",
        code: "no-var",
      });
    });

    it("creates error violation without code", () => {
      const violation = Violation.error("code.linting", "eslint", "Error message");

      expect(violation).toEqual({
        rule: "code.linting",
        tool: "eslint",
        message: "Error message",
        severity: "error",
        code: undefined,
      });
    });
  });

  describe("warning", () => {
    it("creates warning violation with code", () => {
      const violation = Violation.warning(
        "code.linting",
        "eslint",
        "Warning message",
        "prefer-const"
      );

      expect(violation).toEqual({
        rule: "code.linting",
        tool: "eslint",
        message: "Warning message",
        severity: "warning",
        code: "prefer-const",
      });
    });

    it("creates warning violation without code", () => {
      const violation = Violation.warning("code.linting", "eslint", "Warning message");

      expect(violation).toEqual({
        rule: "code.linting",
        tool: "eslint",
        message: "Warning message",
        severity: "warning",
        code: undefined,
      });
    });
  });
});

describe("CheckResult builder", () => {
  describe("pass", () => {
    it("creates pass result with duration", () => {
      const result = CheckResult.pass("ESLint", "code.linting", 100);

      expect(result).toEqual({
        name: "ESLint",
        rule: "code.linting",
        passed: true,
        violations: [],
        skipped: false,
        duration: 100,
      });
    });

    it("creates pass result without duration", () => {
      const result = CheckResult.pass("ESLint", "code.linting");

      expect(result).toEqual({
        name: "ESLint",
        rule: "code.linting",
        passed: true,
        violations: [],
        skipped: false,
        duration: undefined,
      });
    });
  });

  describe("fail", () => {
    it("creates fail result with violations", () => {
      const violations: ViolationType[] = [
        { rule: "code.linting", tool: "eslint", message: "Error", severity: "error" },
      ];
      const result = CheckResult.fail("ESLint", "code.linting", violations, 200);

      expect(result).toEqual({
        name: "ESLint",
        rule: "code.linting",
        passed: false,
        violations,
        skipped: false,
        duration: 200,
      });
    });

    it("creates fail result without duration", () => {
      const violations: ViolationType[] = [
        { rule: "code.linting", tool: "eslint", message: "Error", severity: "error" },
      ];
      const result = CheckResult.fail("ESLint", "code.linting", violations);

      expect(result.duration).toBeUndefined();
    });
  });

  describe("skip", () => {
    it("creates skip result with reason and duration", () => {
      const result = CheckResult.skip("ESLint", "code.linting", "No ESLint config found", 50);

      expect(result).toEqual({
        name: "ESLint",
        rule: "code.linting",
        passed: true,
        violations: [],
        skipped: true,
        skipReason: "No ESLint config found",
        duration: 50,
      });
    });

    it("creates skip result without duration", () => {
      const result = CheckResult.skip("ESLint", "code.linting", "Not installed");

      expect(result.duration).toBeUndefined();
    });
  });

  describe("fromViolations", () => {
    it("creates pass result when violations empty", () => {
      const result = CheckResult.fromViolations("ESLint", "code.linting", [], 100);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("creates fail result when violations exist", () => {
      const violations: ViolationType[] = [
        { rule: "code.linting", tool: "eslint", message: "Error", severity: "error" },
      ];
      const result = CheckResult.fromViolations("ESLint", "code.linting", violations, 100);

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual(violations);
    });

    it("works without duration", () => {
      const result = CheckResult.fromViolations("ESLint", "code.linting", []);

      expect(result.duration).toBeUndefined();
    });
  });
});

describe("DomainResult builder", () => {
  describe("fromChecks", () => {
    it("returns skip status when no checks", () => {
      const result = DomainResult.fromChecks("code", []);

      expect(result).toEqual({
        domain: "code",
        status: "skip",
        checks: [],
        violationCount: 0,
      });
    });

    it("returns skip status when all checks skipped", () => {
      const checks: CheckResultType[] = [
        CheckResult.skip("ESLint", "code.linting", "Not installed"),
        CheckResult.skip("Ruff", "code.linting", "No Python files"),
      ];
      const result = DomainResult.fromChecks("code", checks);

      expect(result.status).toBe("skip");
    });

    it("returns pass status when all checks pass", () => {
      const checks: CheckResultType[] = [
        CheckResult.pass("ESLint", "code.linting"),
        CheckResult.pass("Ruff", "code.linting"),
      ];
      const result = DomainResult.fromChecks("code", checks);

      expect(result.status).toBe("pass");
    });

    it("returns pass status when some pass and some skip", () => {
      const checks: CheckResultType[] = [
        CheckResult.pass("ESLint", "code.linting"),
        CheckResult.skip("Ruff", "code.linting", "No Python files"),
      ];
      const result = DomainResult.fromChecks("code", checks);

      expect(result.status).toBe("pass");
    });

    it("returns fail status when any check fails", () => {
      const violations: ViolationType[] = [
        { rule: "code.linting", tool: "eslint", message: "Error", severity: "error" },
      ];
      const checks: CheckResultType[] = [
        CheckResult.fail("ESLint", "code.linting", violations),
        CheckResult.pass("Ruff", "code.linting"),
      ];
      const result = DomainResult.fromChecks("code", checks);

      expect(result.status).toBe("fail");
    });

    it("calculates violation count correctly", () => {
      const violations1: ViolationType[] = [
        { rule: "code.linting", tool: "eslint", message: "Error 1", severity: "error" },
        { rule: "code.linting", tool: "eslint", message: "Error 2", severity: "error" },
      ];
      const violations2: ViolationType[] = [
        { rule: "code.linting", tool: "ruff", message: "Error 3", severity: "error" },
      ];
      const checks: CheckResultType[] = [
        CheckResult.fail("ESLint", "code.linting", violations1),
        CheckResult.fail("Ruff", "code.linting", violations2),
      ];
      const result = DomainResult.fromChecks("code", checks);

      expect(result.violationCount).toBe(3);
    });

    it("includes all checks in result", () => {
      const checks: CheckResultType[] = [
        CheckResult.pass("ESLint", "code.linting"),
        CheckResult.pass("Ruff", "code.linting"),
        CheckResult.pass("TypeScript", "code.types"),
      ];
      const result = DomainResult.fromChecks("code", checks);

      expect(result.checks).toHaveLength(3);
      expect(result.checks).toEqual(checks);
    });
  });
});

describe("ExitCode", () => {
  it("has SUCCESS as 0", () => {
    expect(ExitCode.SUCCESS).toBe(0);
  });

  it("has VIOLATIONS_FOUND as 1", () => {
    expect(ExitCode.VIOLATIONS_FOUND).toBe(1);
  });

  it("has CONFIG_ERROR as 2", () => {
    expect(ExitCode.CONFIG_ERROR).toBe(2);
  });

  it("has RUNTIME_ERROR as 3", () => {
    expect(ExitCode.RUNTIME_ERROR).toBe(3);
  });
});

describe("Type definitions", () => {
  it("Severity type accepts error and warning", () => {
    const error: Severity = "error";
    const warning: Severity = "warning";
    expect(error).toBe("error");
    expect(warning).toBe("warning");
  });

  it("DomainStatus type accepts pass, fail, and skip", () => {
    const pass: DomainStatus = "pass";
    const fail: DomainStatus = "fail";
    const skip: DomainStatus = "skip";
    expect(pass).toBe("pass");
    expect(fail).toBe("fail");
    expect(skip).toBe("skip");
  });
});

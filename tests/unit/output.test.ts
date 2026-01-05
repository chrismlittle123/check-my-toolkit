import { describe, expect, it } from "vitest";

import {
  formatJson,
  formatOutput,
  formatText,
  type OutputFormat,
} from "../../src/output/index.js";
import type { DomainResult, FullResult, Violation } from "../../src/types/index.js";

function createFullResult(overrides: Partial<FullResult> = {}): FullResult {
  return {
    version: "0.1.0",
    configPath: "/path/to/check.toml",
    domains: {},
    summary: {
      totalViolations: 0,
      exitCode: 0,
    },
    ...overrides,
  };
}

function createDomainResult(overrides: Partial<DomainResult> = {}): DomainResult {
  return {
    domain: "code",
    status: "pass",
    checks: [],
    violationCount: 0,
    ...overrides,
  };
}

function createViolation(overrides: Partial<Violation> = {}): Violation {
  return {
    rule: "code.linting.eslint",
    tool: "eslint",
    message: "Test violation",
    severity: "error",
    ...overrides,
  };
}

describe("formatJson", () => {
  it("formats result as JSON with indentation", () => {
    const result = createFullResult();
    const json = formatJson(result);

    expect(json).toContain('"version": "0.1.0"');
    expect(json).toContain('"configPath": "/path/to/check.toml"');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("includes all domains", () => {
    const result = createFullResult({
      domains: {
        code: createDomainResult({ domain: "code" }),
      },
    });
    const json = formatJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.domains.code).toBeDefined();
    expect(parsed.domains.code.domain).toBe("code");
  });

  it("includes violations in JSON", () => {
    const result = createFullResult({
      domains: {
        code: createDomainResult({
          checks: [
            {
              name: "ESLint",
              rule: "code.linting",
              passed: false,
              violations: [createViolation({ message: "Test error" })],
              skipped: false,
            },
          ],
        }),
      },
    });
    const json = formatJson(result);

    expect(json).toContain("Test error");
  });
});

describe("formatText", () => {
  it("includes version header", () => {
    const result = createFullResult({ version: "0.1.0" });
    const text = formatText(result);

    expect(text).toContain("check-my-toolkit v0.1.0");
  });

  it("includes config path", () => {
    const result = createFullResult({ configPath: "/my/project/check.toml" });
    const text = formatText(result);

    expect(text).toContain("Config: /my/project/check.toml");
  });

  it("shows all checks passed when no violations", () => {
    const result = createFullResult({
      summary: { totalViolations: 0, exitCode: 0 },
    });
    const text = formatText(result);

    expect(text).toContain("✓ All checks passed");
  });

  it("shows violation count when violations exist", () => {
    const result = createFullResult({
      summary: { totalViolations: 5, exitCode: 1 },
    });
    const text = formatText(result);

    expect(text).toContain("✗ 5 violation(s) found");
  });

  it("formats domain with pass status", () => {
    const result = createFullResult({
      domains: {
        code: createDomainResult({ domain: "code", status: "pass" }),
      },
    });
    const text = formatText(result);

    expect(text).toContain("✓ CODE");
  });

  it("formats domain with fail status", () => {
    const result = createFullResult({
      domains: {
        code: createDomainResult({ domain: "code", status: "fail" }),
      },
    });
    const text = formatText(result);

    expect(text).toContain("✗ CODE");
  });

  it("formats domain with skip status", () => {
    const result = createFullResult({
      domains: {
        code: createDomainResult({ domain: "code", status: "skip" }),
      },
    });
    const text = formatText(result);

    expect(text).toContain("○ CODE");
  });

  it("formats passed check", () => {
    const result = createFullResult({
      domains: {
        code: createDomainResult({
          checks: [
            {
              name: "ESLint",
              rule: "code.linting",
              passed: true,
              violations: [],
              skipped: false,
              duration: 100,
            },
          ],
        }),
      },
    });
    const text = formatText(result);

    expect(text).toContain("✓ ESLint: passed");
    expect(text).toContain("(100ms)");
  });

  it("formats skipped check", () => {
    const result = createFullResult({
      domains: {
        code: createDomainResult({
          checks: [
            {
              name: "ESLint",
              rule: "code.linting",
              passed: true,
              violations: [],
              skipped: true,
              skipReason: "No ESLint config found",
              duration: 5,
            },
          ],
        }),
      },
    });
    const text = formatText(result);

    // Note: getCheckIcon returns "✓" for passed=true before checking skipped
    expect(text).toContain("✓ ESLint: skipped - No ESLint config found");
  });

  it("formats failed check with violations", () => {
    const result = createFullResult({
      domains: {
        code: createDomainResult({
          checks: [
            {
              name: "ESLint",
              rule: "code.linting",
              passed: false,
              violations: [
                createViolation({
                  file: "src/index.ts",
                  line: 10,
                  column: 5,
                  message: "Unexpected var",
                  code: "no-var",
                  severity: "error",
                }),
              ],
              skipped: false,
              duration: 200,
            },
          ],
        }),
      },
    });
    const text = formatText(result);

    expect(text).toContain("✗ ESLint: 1 violation(s)");
    expect(text).toContain("src/index.ts:10:5 error [no-var] Unexpected var");
  });

  it("formats violation without file location", () => {
    const result = createFullResult({
      domains: {
        code: createDomainResult({
          checks: [
            {
              name: "ESLint",
              rule: "code.linting",
              passed: false,
              violations: [
                createViolation({
                  message: "Config error occurred",
                  severity: "error",
                  code: undefined,
                  file: undefined,
                }),
              ],
              skipped: false,
            },
          ],
        }),
      },
    });
    const text = formatText(result);

    // No file location, no code - format is "error  Config error occurred"
    expect(text).toContain("error  Config error occurred");
  });

  it("formats violation with warning severity", () => {
    const result = createFullResult({
      domains: {
        code: createDomainResult({
          checks: [
            {
              name: "ESLint",
              rule: "code.linting",
              passed: false,
              violations: [
                createViolation({
                  file: "src/index.ts",
                  line: 5,
                  column: 1,
                  message: "Prefer const",
                  code: "prefer-const",
                  severity: "warning",
                }),
              ],
              skipped: false,
            },
          ],
        }),
      },
    });
    const text = formatText(result);

    expect(text).toContain("warn [prefer-const] Prefer const");
  });

  it("truncates violations after 10", () => {
    const violations: Violation[] = Array.from({ length: 15 }, (_, i) =>
      createViolation({
        file: `file${i}.ts`,
        line: i,
        column: 1,
        message: `Violation ${i}`,
      })
    );

    const result = createFullResult({
      domains: {
        code: createDomainResult({
          checks: [
            {
              name: "ESLint",
              rule: "code.linting",
              passed: false,
              violations,
              skipped: false,
            },
          ],
        }),
      },
    });
    const text = formatText(result);

    expect(text).toContain("... and 5 more");
    expect(text).toContain("Violation 0");
    expect(text).toContain("Violation 9");
    expect(text).not.toContain("Violation 10");
  });

  it("handles check without duration", () => {
    const result = createFullResult({
      domains: {
        code: createDomainResult({
          checks: [
            {
              name: "ESLint",
              rule: "code.linting",
              passed: true,
              violations: [],
              skipped: false,
            },
          ],
        }),
      },
    });
    const text = formatText(result);

    expect(text).toContain("✓ ESLint: passed");
    expect(text).not.toContain("ms)");
  });

  it("formats skipped check with passed=false (edge case)", () => {
    // This covers the branch where skipped=true but passed=false
    const result = createFullResult({
      domains: {
        code: createDomainResult({
          checks: [
            {
              name: "TestTool",
              rule: "code.test",
              passed: false,
              violations: [],
              skipped: true,
              skipReason: "Tool not available",
              duration: 10,
            },
          ],
        }),
      },
    });
    const text = formatText(result);

    // When passed=false and skipped=true, getCheckIcon returns "○"
    expect(text).toContain("○ TestTool: skipped - Tool not available");
  });

  it("handles violation with undefined line/column by showing just filename", () => {
    const result = createFullResult({
      domains: {
        code: createDomainResult({
          checks: [
            {
              name: "ESLint",
              rule: "code.linting",
              passed: false,
              violations: [
                createViolation({
                  file: "src/index.ts",
                  line: undefined,
                  column: undefined,
                  message: "Some error",
                }),
              ],
              skipped: false,
            },
          ],
        }),
      },
    });
    const text = formatText(result);

    // Should show just filename without :0:0 when line/column are undefined
    expect(text).toContain("src/index.ts");
    expect(text).not.toContain("src/index.ts:0:0");
  });
});

describe("formatOutput", () => {
  it("returns JSON for json format", () => {
    const result = createFullResult();
    const output = formatOutput(result, "json");

    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("returns text for text format", () => {
    const result = createFullResult();
    const output = formatOutput(result, "text");

    expect(output).toContain("check-my-toolkit");
  });

  it("defaults to text format for unknown format", () => {
    const result = createFullResult();
    const output = formatOutput(result, "unknown" as OutputFormat);

    expect(output).toContain("check-my-toolkit");
  });
});

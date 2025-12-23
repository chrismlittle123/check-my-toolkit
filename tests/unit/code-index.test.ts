import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  auditCodeConfig,
  runCodeChecks,
} from "../../src/code/index.js";
import type { Config } from "../../src/config/schema.js";

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

function createConfig(overrides: Partial<Config> = {}): Config {
  return {
    code: {
      linting: {
        eslint: { enabled: false },
        ruff: { enabled: false },
      },
      types: {
        tsc: { enabled: false },
      },
      complexity: {},
      files: {
        repo: [],
        tooling: [],
        docs: [],
      },
    },
    process: {},
    stack: {},
    ...overrides,
  };
}

describe("runCodeChecks", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-code-test-"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns skip status when no tools enabled", async () => {
    const config = createConfig();
    const result = await runCodeChecks(tempDir, config);

    expect(result.domain).toBe("code");
    expect(result.status).toBe("skip");
    expect(result.checks).toHaveLength(0);
    expect(result.violationCount).toBe(0);
  });

  it("runs ESLint when enabled", async () => {
    const config = createConfig({
      code: {
        linting: {
          eslint: { enabled: true },
          ruff: { enabled: false },
        },
        types: { tsc: { enabled: false } },
      },
    });

    fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
    mockedExeca.mockResolvedValueOnce({
      stdout: "[]",
      stderr: "",
      exitCode: 0,
    } as never);

    const result = await runCodeChecks(tempDir, config);

    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].name).toBe("ESLint");
    expect(result.checks[0].passed).toBe(true);
  });

  it("runs Ruff when enabled", async () => {
    const config = createConfig({
      code: {
        linting: {
          eslint: { enabled: false },
          ruff: { enabled: true },
        },
        types: { tsc: { enabled: false } },
      },
    });

    fs.writeFileSync(path.join(tempDir, "test.py"), "");
    mockedExeca.mockResolvedValueOnce({
      stdout: "test.py",
      stderr: "",
      exitCode: 0,
    } as never);
    mockedExeca.mockResolvedValueOnce({
      stdout: "[]",
      stderr: "",
      exitCode: 0,
    } as never);

    const result = await runCodeChecks(tempDir, config);

    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].name).toBe("Ruff");
  });

  it("runs tsc when enabled", async () => {
    const config = createConfig({
      code: {
        linting: {
          eslint: { enabled: false },
          ruff: { enabled: false },
        },
        types: { tsc: { enabled: true } },
      },
    });

    fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");
    mockedExeca.mockResolvedValueOnce({
      stdout: "",
      stderr: "",
      exitCode: 0,
    } as never);

    const result = await runCodeChecks(tempDir, config);

    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].name).toBe("TypeScript");
  });

  it("runs multiple tools in parallel", async () => {
    const config = createConfig({
      code: {
        linting: {
          eslint: { enabled: true },
          ruff: { enabled: true },
        },
        types: { tsc: { enabled: true } },
      },
    });

    fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
    fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");
    fs.writeFileSync(path.join(tempDir, "test.py"), "");

    mockedExeca.mockResolvedValue({
      stdout: "[]",
      stderr: "",
      exitCode: 0,
    } as never);

    const result = await runCodeChecks(tempDir, config);

    expect(result.checks).toHaveLength(3);
    const names = result.checks.map((c) => c.name);
    expect(names).toContain("ESLint");
    expect(names).toContain("Ruff");
    expect(names).toContain("TypeScript");
  });

  it("calculates violation count correctly", async () => {
    const config = createConfig({
      code: {
        linting: {
          eslint: { enabled: true },
          ruff: { enabled: false },
        },
        types: { tsc: { enabled: false } },
      },
    });

    fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
    const eslintOutput = JSON.stringify([
      {
        filePath: path.join(tempDir, "src/index.ts"),
        messages: [
          { ruleId: "no-var", severity: 2, message: "Error 1", line: 1, column: 1 },
          { ruleId: "semi", severity: 1, message: "Error 2", line: 2, column: 1 },
        ],
      },
    ]);

    mockedExeca.mockResolvedValueOnce({
      stdout: eslintOutput,
      stderr: "",
      exitCode: 1,
    } as never);

    const result = await runCodeChecks(tempDir, config);

    expect(result.violationCount).toBe(2);
    expect(result.status).toBe("fail");
  });

  it("sets pass status when all checks pass", async () => {
    const config = createConfig({
      code: {
        linting: {
          eslint: { enabled: true },
          ruff: { enabled: false },
        },
        types: { tsc: { enabled: false } },
      },
    });

    fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
    mockedExeca.mockResolvedValueOnce({
      stdout: "[]",
      stderr: "",
      exitCode: 0,
    } as never);

    const result = await runCodeChecks(tempDir, config);

    expect(result.status).toBe("pass");
  });

  it("handles undefined code config", async () => {
    const config: Config = {};
    const result = await runCodeChecks(tempDir, config);

    expect(result.status).toBe("skip");
    expect(result.checks).toHaveLength(0);
  });

  it("handles undefined linting config", async () => {
    const config: Config = {
      code: {},
    };
    const result = await runCodeChecks(tempDir, config);

    expect(result.status).toBe("skip");
  });

  it("handles undefined types config", async () => {
    const config: Config = {
      code: {
        linting: {},
      },
    };
    const result = await runCodeChecks(tempDir, config);

    expect(result.status).toBe("skip");
  });
});

describe("auditCodeConfig", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-code-audit-"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns skip status when no tools enabled", async () => {
    const config = createConfig();
    const result = await auditCodeConfig(tempDir, config);

    expect(result.domain).toBe("code");
    expect(result.status).toBe("skip");
    expect(result.checks).toHaveLength(0);
  });

  it("audits ESLint config when enabled", async () => {
    const config = createConfig({
      code: {
        linting: {
          eslint: { enabled: true },
          ruff: { enabled: false },
        },
        types: { tsc: { enabled: false } },
      },
    });

    fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");

    const result = await auditCodeConfig(tempDir, config);

    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].name).toBe("ESLint Config");
    expect(result.checks[0].passed).toBe(true);
  });

  it("fails audit when config missing", async () => {
    const config = createConfig({
      code: {
        linting: {
          eslint: { enabled: true },
          ruff: { enabled: false },
        },
        types: { tsc: { enabled: false } },
      },
    });

    const result = await auditCodeConfig(tempDir, config);

    expect(result.checks[0].passed).toBe(false);
    expect(result.violationCount).toBe(1);
    expect(result.status).toBe("fail");
  });

  it("audits multiple tools", async () => {
    const config = createConfig({
      code: {
        linting: {
          eslint: { enabled: true },
          ruff: { enabled: true },
        },
        types: { tsc: { enabled: true } },
      },
    });

    fs.writeFileSync(path.join(tempDir, "eslint.config.js"), "");
    fs.writeFileSync(path.join(tempDir, "ruff.toml"), "");
    fs.writeFileSync(path.join(tempDir, "tsconfig.json"), "{}");

    const result = await auditCodeConfig(tempDir, config);

    expect(result.checks).toHaveLength(3);
    expect(result.checks.every((c) => c.passed)).toBe(true);
    expect(result.status).toBe("pass");
  });
});

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CoverageRunner } from "../../src/process/tools/coverage.js";

describe("CoverageRunner", () => {
  let tempDir: string;
  let runner: CoverageRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-coverage-test-"));
    runner = new CoverageRunner();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /** Helper to create a file with content */
  function createFile(relativePath: string, content: string): void {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  describe("metadata", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Coverage");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("process.coverage");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("coverage");
    });

    it("has empty configFiles", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("run", () => {
    describe("config mode (vitest)", () => {
      it("passes when vitest config has coverage thresholds", async () => {
        createFile(
          "vitest.config.ts",
          `
export default {
  test: {
    coverage: {
      thresholds: {
        lines: 80,
        statements: 80,
      }
    }
  }
}
`
        );
        runner.setConfig({ enabled: true, enforce_in: "config" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("fails when vitest config has no coverage thresholds", async () => {
        createFile(
          "vitest.config.ts",
          `
export default {
  test: {
    coverage: {
      reporter: ['text', 'html']
    }
  }
}
`
        );
        runner.setConfig({ enabled: true, enforce_in: "config" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.coverage.config");
      });

      it("fails when no coverage config file exists and no min_threshold set", async () => {
        runner.setConfig({ enabled: true, enforce_in: "config" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].message).toContain("No coverage threshold config found");
      });

      it("passes when min_threshold is set in check.toml even without tool config", async () => {
        // No vitest.config.ts, jest.config.js, or .nycrc - just check.toml min_threshold
        runner.setConfig({ enabled: true, enforce_in: "config", min_threshold: 80 });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("fails when threshold is below minimum", async () => {
        createFile(
          "vitest.config.ts",
          `
export default {
  test: {
    coverage: {
      thresholds: {
        lines: 60,
      }
    }
  }
}
`
        );
        runner.setConfig({ enabled: true, enforce_in: "config", min_threshold: 80 });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].rule).toBe("process.coverage.threshold");
        expect(result.violations[0].message).toContain("60%");
        expect(result.violations[0].message).toContain("80%");
      });

      it("passes when threshold meets minimum", async () => {
        createFile(
          "vitest.config.ts",
          `
export default {
  test: {
    coverage: {
      thresholds: {
        lines: 85,
      }
    }
  }
}
`
        );
        runner.setConfig({ enabled: true, enforce_in: "config", min_threshold: 80 });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });
    });

    describe("config mode (jest)", () => {
      it("passes when jest config has coverageThreshold", async () => {
        createFile(
          "jest.config.js",
          `
module.exports = {
  coverageThreshold: {
    global: {
      lines: 80,
    }
  }
}
`
        );
        runner.setConfig({ enabled: true, enforce_in: "config" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("passes when jest config in package.json has coverageThreshold", async () => {
        createFile(
          "package.json",
          JSON.stringify({
            name: "test",
            jest: {
              coverageThreshold: {
                global: {
                  lines: 80,
                },
              },
            },
          })
        );
        runner.setConfig({ enabled: true, enforce_in: "config" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });
    });

    describe("config mode (nyc)", () => {
      it("passes when .nycrc has check-coverage enabled", async () => {
        createFile(
          ".nycrc",
          JSON.stringify({
            "check-coverage": true,
            lines: 80,
          })
        );
        runner.setConfig({ enabled: true, enforce_in: "config" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("fails when .nycrc has check-coverage disabled", async () => {
        createFile(
          ".nycrc",
          JSON.stringify({
            "check-coverage": false,
            lines: 80,
          })
        );
        runner.setConfig({ enabled: true, enforce_in: "config" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
      });

      it("passes when nyc config in package.json has check-coverage", async () => {
        createFile(
          "package.json",
          JSON.stringify({
            name: "test",
            nyc: {
              "check-coverage": true,
              lines: 80,
            },
          })
        );
        runner.setConfig({ enabled: true, enforce_in: "config" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });
    });

    describe("ci mode", () => {
      it("passes when workflow has coverage enforcement", async () => {
        createFile(
          ".github/workflows/ci.yml",
          `
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:coverage
`
        );
        runner.setConfig({ enabled: true, enforce_in: "ci", ci_workflow: "ci.yml" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("passes when workflow has vitest coverage thresholds", async () => {
        createFile(
          ".github/workflows/ci.yml",
          `
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test -- --coverage --coverage.thresholds.lines=80
`
        );
        runner.setConfig({ enabled: true, enforce_in: "ci", ci_workflow: "ci.yml" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("fails when workflow does not have coverage enforcement", async () => {
        createFile(
          ".github/workflows/ci.yml",
          `
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
`
        );
        runner.setConfig({ enabled: true, enforce_in: "ci", ci_workflow: "ci.yml" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].rule).toBe("process.coverage.ci");
      });

      it("fails when workflow file does not exist", async () => {
        runner.setConfig({ enabled: true, enforce_in: "ci", ci_workflow: "ci.yml" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations[0].message).toContain("Workflow file not found");
      });

      it("checks specific job when ci_job is set", async () => {
        createFile(
          ".github/workflows/ci.yml",
          `
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:coverage
`
        );
        runner.setConfig({
          enabled: true,
          enforce_in: "ci",
          ci_workflow: "ci.yml",
          ci_job: "test",
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });
    });

    describe("both mode", () => {
      it("passes when both config and CI have coverage", async () => {
        createFile(
          "vitest.config.ts",
          `
export default {
  test: {
    coverage: {
      thresholds: { lines: 80 }
    }
  }
}
`
        );
        createFile(
          ".github/workflows/ci.yml",
          `
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:coverage
`
        );
        runner.setConfig({ enabled: true, enforce_in: "both", ci_workflow: "ci.yml" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("fails when only config has coverage (CI missing)", async () => {
        createFile(
          "vitest.config.ts",
          `
export default {
  test: {
    coverage: {
      thresholds: { lines: 80 }
    }
  }
}
`
        );
        createFile(
          ".github/workflows/ci.yml",
          `
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
`
        );
        runner.setConfig({ enabled: true, enforce_in: "both", ci_workflow: "ci.yml" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.coverage.ci");
      });

      it("fails when only CI has coverage (config missing)", async () => {
        createFile(
          ".github/workflows/ci.yml",
          `
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:coverage
`
        );
        runner.setConfig({ enabled: true, enforce_in: "both", ci_workflow: "ci.yml" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule).toBe("process.coverage.config");
      });

      it("reports both violations when neither has coverage", async () => {
        createFile(
          ".github/workflows/ci.yml",
          `
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
`
        );
        runner.setConfig({ enabled: true, enforce_in: "both", ci_workflow: "ci.yml" });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
        expect(result.violations.map((v) => v.rule)).toContain("process.coverage.config");
        expect(result.violations.map((v) => v.rule)).toContain("process.coverage.ci");
      });
    });
  });

  describe("audit", () => {
    it("returns same result as run", async () => {
      createFile(
        "vitest.config.ts",
        `
export default {
  test: {
    coverage: {
      thresholds: { lines: 80 }
    }
  }
}
`
      );
      runner.setConfig({ enabled: true, enforce_in: "config" });

      const runResult = await runner.run(tempDir);
      const auditResult = await runner.audit(tempDir);

      expect(auditResult.passed).toBe(runResult.passed);
    });
  });

  describe("setConfig", () => {
    it("merges config with defaults", async () => {
      createFile(
        "vitest.config.ts",
        `
export default {
  test: {
    coverage: {
      thresholds: { lines: 80 }
    }
  }
}
`
      );
      runner.setConfig({ enabled: true });

      const result = await runner.run(tempDir);
      // Should use default enforce_in: "config"
      expect(result.passed).toBe(true);
    });
  });
});

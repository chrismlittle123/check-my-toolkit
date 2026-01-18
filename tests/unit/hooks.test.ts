import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HooksRunner } from "../../src/process/tools/hooks.js";

describe("HooksRunner", () => {
  let tempDir: string;
  let runner: HooksRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-hooks-test-"));
    runner = new HooksRunner();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("metadata", () => {
    it("has correct name", () => {
      expect(runner.name).toBe("Hooks");
    });

    it("has correct rule", () => {
      expect(runner.rule).toBe("process.hooks");
    });

    it("has correct toolId", () => {
      expect(runner.toolId).toBe("hooks");
    });

    it("has empty configFiles", () => {
      expect(runner.configFiles).toEqual([]);
    });
  });

  describe("run", () => {
    describe("husky check", () => {
      it("passes when husky directory exists", async () => {
        fs.mkdirSync(path.join(tempDir, ".husky"), { recursive: true });
        runner.setConfig({ enabled: true, require_husky: true });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when husky directory does not exist", async () => {
        runner.setConfig({ enabled: true, require_husky: true });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("Husky not installed");
      });

      it("passes when husky is not required", async () => {
        runner.setConfig({ enabled: true, require_husky: false });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });
    });

    describe("required hooks check", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".husky"), { recursive: true });
      });

      it("passes when all required hooks exist", async () => {
        fs.writeFileSync(path.join(tempDir, ".husky/pre-commit"), "#!/bin/sh\nnpm run lint");
        fs.writeFileSync(path.join(tempDir, ".husky/pre-push"), "#!/bin/sh\nnpm test");
        runner.setConfig({
          enabled: true,
          require_husky: true,
          require_hooks: ["pre-commit", "pre-push"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("fails when required hook is missing", async () => {
        fs.writeFileSync(path.join(tempDir, ".husky/pre-commit"), "#!/bin/sh\nnpm run lint");
        runner.setConfig({
          enabled: true,
          require_husky: true,
          require_hooks: ["pre-commit", "pre-push"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("Required hook 'pre-push' not found");
        expect(result.violations[0].file).toBe(".husky/pre-push");
      });

      it("reports all missing hooks", async () => {
        runner.setConfig({
          enabled: true,
          require_husky: true,
          require_hooks: ["pre-commit", "pre-push", "commit-msg"],
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(3);
      });
    });

    describe("hook commands check", () => {
      beforeEach(() => {
        fs.mkdirSync(path.join(tempDir, ".husky"), { recursive: true });
      });

      it("passes when hook contains required command", async () => {
        fs.writeFileSync(path.join(tempDir, ".husky/pre-commit"), "#!/bin/sh\nlint-staged\n");
        runner.setConfig({
          enabled: true,
          require_husky: true,
          require_hooks: ["pre-commit"],
          commands: { "pre-commit": ["lint-staged"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(true);
      });

      it("fails when hook is missing required command", async () => {
        fs.writeFileSync(path.join(tempDir, ".husky/pre-commit"), "#!/bin/sh\nnpm run lint\n");
        runner.setConfig({
          enabled: true,
          require_husky: true,
          require_hooks: ["pre-commit"],
          commands: { "pre-commit": ["lint-staged"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].message).toContain("does not contain required command");
        expect(result.violations[0].message).toContain("lint-staged");
      });

      it("reports all missing commands", async () => {
        fs.writeFileSync(path.join(tempDir, ".husky/pre-commit"), "#!/bin/sh\necho hello\n");
        runner.setConfig({
          enabled: true,
          require_husky: true,
          require_hooks: ["pre-commit"],
          commands: { "pre-commit": ["lint-staged", "npm test"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
      });

      it("skips command check for missing hooks", async () => {
        runner.setConfig({
          enabled: true,
          require_husky: true,
          commands: { "pre-commit": ["lint-staged"] },
        });

        const result = await runner.run(tempDir);
        // Should pass because we only check commands for hooks that exist
        expect(result.passed).toBe(true);
      });
    });

    describe("combined checks", () => {
      it("reports both missing hook and missing command", async () => {
        fs.mkdirSync(path.join(tempDir, ".husky"), { recursive: true });
        fs.writeFileSync(path.join(tempDir, ".husky/pre-commit"), "#!/bin/sh\necho hello\n");
        runner.setConfig({
          enabled: true,
          require_husky: true,
          require_hooks: ["pre-commit", "pre-push"],
          commands: { "pre-commit": ["lint-staged"] },
        });

        const result = await runner.run(tempDir);
        expect(result.passed).toBe(false);
        expect(result.violations).toHaveLength(2);
        expect(result.violations.some((v) => v.message.includes("pre-push"))).toBe(true);
        expect(result.violations.some((v) => v.message.includes("lint-staged"))).toBe(true);
      });
    });
  });

  describe("audit", () => {
    it("returns same result as run", async () => {
      fs.mkdirSync(path.join(tempDir, ".husky"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, ".husky/pre-commit"), "#!/bin/sh\nlint-staged\n");
      runner.setConfig({
        enabled: true,
        require_husky: true,
        require_hooks: ["pre-commit"],
      });

      const runResult = await runner.run(tempDir);
      const auditResult = await runner.audit(tempDir);

      expect(auditResult.passed).toBe(runResult.passed);
      expect(auditResult.violations).toEqual(runResult.violations);
    });
  });

  describe("setConfig", () => {
    it("merges config with defaults", async () => {
      fs.mkdirSync(path.join(tempDir, ".husky"), { recursive: true });

      // Default require_husky is true
      runner.setConfig({ enabled: true });
      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });

    it("allows overriding defaults", async () => {
      // No .husky directory
      runner.setConfig({ enabled: true, require_husky: false });
      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });
  });

  describe("protected_branches", () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(tempDir, ".husky"), { recursive: true });
    });

    it("does nothing when protected_branches is not configured", async () => {
      runner.setConfig({ enabled: true, require_husky: true });

      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });

    it("fails when pre-push hook does not exist", async () => {
      runner.setConfig({
        enabled: true,
        require_husky: true,
        protected_branches: ["main"],
      });

      const result = await runner.run(tempDir);
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("Pre-push hook not found");
      expect(result.violations[0].file).toBe(".husky/pre-push");
    });

    it("fails when pre-push hook does not detect current branch", async () => {
      fs.writeFileSync(path.join(tempDir, ".husky/pre-push"), "#!/bin/sh\necho 'Hello'\n");
      runner.setConfig({
        enabled: true,
        require_husky: true,
        protected_branches: ["main"],
      });

      const result = await runner.run(tempDir);
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("does not detect current branch");
    });

    it("fails when pre-push hook does not check for protected branch", async () => {
      fs.writeFileSync(
        path.join(tempDir, ".husky/pre-push"),
        `#!/bin/sh
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "develop" ]; then
  exit 1
fi
`
      );
      runner.setConfig({
        enabled: true,
        require_husky: true,
        protected_branches: ["main"],
      });

      const result = await runner.run(tempDir);
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain('does not check for protected branch "main"');
    });

    it("passes when pre-push hook checks for protected branch using rev-parse", async () => {
      fs.writeFileSync(
        path.join(tempDir, ".husky/pre-push"),
        `#!/bin/sh
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ]; then
  echo "Direct pushes to main are not allowed."
  exit 1
fi
`
      );
      runner.setConfig({
        enabled: true,
        require_husky: true,
        protected_branches: ["main"],
      });

      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });

    it("passes when pre-push hook checks for protected branch using branch --show-current", async () => {
      fs.writeFileSync(
        path.join(tempDir, ".husky/pre-push"),
        `#!/bin/sh
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ]; then
  echo "Direct pushes to main are not allowed."
  exit 1
fi
`
      );
      runner.setConfig({
        enabled: true,
        require_husky: true,
        protected_branches: ["main"],
      });

      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });

    it("passes when pre-push hook checks for protected branch using symbolic-ref", async () => {
      fs.writeFileSync(
        path.join(tempDir, ".husky/pre-push"),
        `#!/bin/sh
BRANCH=$(git symbolic-ref --short HEAD)
if [ "$BRANCH" = "main" ]; then
  echo "Direct pushes to main are not allowed."
  exit 1
fi
`
      );
      runner.setConfig({
        enabled: true,
        require_husky: true,
        protected_branches: ["main"],
      });

      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });

    it("checks all protected branches", async () => {
      fs.writeFileSync(
        path.join(tempDir, ".husky/pre-push"),
        `#!/bin/sh
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ]; then
  exit 1
fi
`
      );
      runner.setConfig({
        enabled: true,
        require_husky: true,
        protected_branches: ["main", "master", "release"],
      });

      const result = await runner.run(tempDir);
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2); // master and release missing
      expect(result.violations.some((v) => v.message.includes('"master"'))).toBe(true);
      expect(result.violations.some((v) => v.message.includes('"release"'))).toBe(true);
    });

    it("passes when all protected branches are checked", async () => {
      fs.writeFileSync(
        path.join(tempDir, ".husky/pre-push"),
        `#!/bin/sh
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "Direct pushes to main/master are not allowed."
  exit 1
fi
`
      );
      runner.setConfig({
        enabled: true,
        require_husky: true,
        protected_branches: ["main", "master"],
      });

      const result = await runner.run(tempDir);
      expect(result.passed).toBe(true);
    });
  });
});

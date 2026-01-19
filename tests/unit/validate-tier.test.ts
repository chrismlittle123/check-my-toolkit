import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  formatTierResultJson,
  formatTierResultText,
  validateTierRuleset,
} from "../../src/validate/index.js";

describe("validateTierRuleset", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-tier-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("tier matching", () => {
    it("passes when production tier has production ruleset", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[extends]
registry = "./rulesets"
rulesets = ["base-production"]

[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: production");

      const result = validateTierRuleset({ config: configPath });

      expect(result.valid).toBe(true);
      expect(result.tier).toBe("production");
      expect(result.tierSource).toBe("repo-metadata.yaml");
      expect(result.matchedRulesets).toContain("base-production");
    });

    it("passes when internal tier has internal ruleset", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[extends]
registry = "./rulesets"
rulesets = ["base-internal"]

[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: internal");

      const result = validateTierRuleset({ config: configPath });

      expect(result.valid).toBe(true);
      expect(result.tier).toBe("internal");
      expect(result.matchedRulesets).toContain("base-internal");
    });

    it("passes when prototype tier has prototype ruleset", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[extends]
registry = "./rulesets"
rulesets = ["base-prototype"]

[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: prototype");

      const result = validateTierRuleset({ config: configPath });

      expect(result.valid).toBe(true);
      expect(result.tier).toBe("prototype");
      expect(result.matchedRulesets).toContain("base-prototype");
    });

    it("fails when production tier has only internal ruleset", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[extends]
registry = "./rulesets"
rulesets = ["base-internal"]

[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: production");

      const result = validateTierRuleset({ config: configPath });

      expect(result.valid).toBe(false);
      expect(result.tier).toBe("production");
      expect(result.expectedPattern).toBe("*-production");
      expect(result.error).toContain("No ruleset matching pattern");
    });

    it("fails when internal tier has only prototype ruleset", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[extends]
registry = "./rulesets"
rulesets = ["base-prototype"]

[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: internal");

      const result = validateTierRuleset({ config: configPath });

      expect(result.valid).toBe(false);
      expect(result.tier).toBe("internal");
      expect(result.error).toContain("No ruleset matching pattern");
    });
  });

  describe("default tier behavior", () => {
    it("defaults to internal when repo-metadata.yaml is missing", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[extends]
registry = "./rulesets"
rulesets = ["base-internal"]

[code.linting.eslint]
enabled = true`
      );
      // No repo-metadata.yaml created

      const result = validateTierRuleset({ config: configPath });

      expect(result.valid).toBe(true);
      expect(result.tier).toBe("internal");
      expect(result.tierSource).toBe("default");
    });

    it("defaults to internal when tier field is missing", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[extends]
registry = "./rulesets"
rulesets = ["base-internal"]

[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "name: my-project");

      const result = validateTierRuleset({ config: configPath });

      expect(result.valid).toBe(true);
      expect(result.tier).toBe("internal");
      expect(result.tierSource).toBe("default");
    });

    it("defaults to internal when tier value is invalid", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[extends]
registry = "./rulesets"
rulesets = ["base-internal"]

[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: invalid-tier");

      const result = validateTierRuleset({ config: configPath });

      expect(result.valid).toBe(true);
      expect(result.tier).toBe("internal");
      expect(result.tierSource).toBe("default");
    });
  });

  describe("no extends section", () => {
    it("passes when no extends section exists", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: production");

      const result = validateTierRuleset({ config: configPath });

      expect(result.valid).toBe(true);
      expect(result.tier).toBe("production");
      expect(result.rulesets).toEqual([]);
      expect(result.matchedRulesets).toEqual([]);
    });

    it("passes when rulesets array is empty", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[extends]
registry = "./rulesets"
rulesets = []

[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: production");

      const result = validateTierRuleset({ config: configPath });

      expect(result.valid).toBe(true);
      expect(result.tier).toBe("production");
      expect(result.rulesets).toEqual([]);
    });
  });

  describe("multiple rulesets", () => {
    it("passes when at least one ruleset matches tier", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[extends]
registry = "./rulesets"
rulesets = ["base", "typescript", "security-production"]

[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: production");

      const result = validateTierRuleset({ config: configPath });

      expect(result.valid).toBe(true);
      expect(result.matchedRulesets).toContain("security-production");
      expect(result.matchedRulesets).toHaveLength(1);
    });

    it("matches multiple rulesets with same tier suffix", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[extends]
registry = "./rulesets"
rulesets = ["base-production", "security-production", "lint-production"]

[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: production");

      const result = validateTierRuleset({ config: configPath });

      expect(result.valid).toBe(true);
      expect(result.matchedRulesets).toHaveLength(3);
    });

    it("does not match ruleset containing tier string but not ending with it", () => {
      const configPath = path.join(tempDir, "check.toml");
      fs.writeFileSync(
        configPath,
        `[extends]
registry = "./rulesets"
rulesets = ["production-extra", "base"]

[code.linting.eslint]
enabled = true`
      );
      fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: production");

      const result = validateTierRuleset({ config: configPath });

      expect(result.valid).toBe(false);
      expect(result.matchedRulesets).toHaveLength(0);
    });
  });

  describe("missing config", () => {
    it("returns invalid when check.toml is missing", () => {
      const result = validateTierRuleset({ config: "/nonexistent/check.toml" });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("No check.toml found");
    });
  });
});

describe("formatTierResultText", () => {
  it("formats passing result", () => {
    const result = {
      valid: true,
      tier: "production" as const,
      tierSource: "repo-metadata.yaml" as const,
      rulesets: ["base-production"],
      expectedPattern: "*-production",
      matchedRulesets: ["base-production"],
    };

    const output = formatTierResultText(result);

    expect(output).toContain("Tier validation passed");
    expect(output).toContain("production");
    expect(output).toContain("repo-metadata.yaml");
    expect(output).toContain("base-production");
  });

  it("formats failing result", () => {
    const result = {
      valid: false,
      tier: "production" as const,
      tierSource: "repo-metadata.yaml" as const,
      rulesets: ["base-internal"],
      expectedPattern: "*-production",
      matchedRulesets: [],
      error: "No ruleset matching pattern '*-production' found",
    };

    const output = formatTierResultText(result);

    expect(output).toContain("Tier validation failed");
    expect(output).toContain("*-production");
    expect(output).toContain("base-internal");
    expect(output).toContain("Error:");
  });

  it("shows default tier source", () => {
    const result = {
      valid: true,
      tier: "internal" as const,
      tierSource: "default" as const,
      rulesets: [],
      expectedPattern: "*-internal",
      matchedRulesets: [],
    };

    const output = formatTierResultText(result);

    expect(output).toContain("source: default");
  });

  it("shows no extends message when no rulesets", () => {
    const result = {
      valid: true,
      tier: "production" as const,
      tierSource: "repo-metadata.yaml" as const,
      rulesets: [],
      expectedPattern: "*-production",
      matchedRulesets: [],
    };

    const output = formatTierResultText(result);

    expect(output).toContain("No extends configured");
  });
});

describe("formatTierResultJson", () => {
  it("outputs valid JSON", () => {
    const result = {
      valid: true,
      tier: "production" as const,
      tierSource: "repo-metadata.yaml" as const,
      rulesets: ["base-production"],
      expectedPattern: "*-production",
      matchedRulesets: ["base-production"],
    };

    const output = formatTierResultJson(result);
    const parsed = JSON.parse(output);

    expect(parsed.valid).toBe(true);
    expect(parsed.tier).toBe("production");
    expect(parsed.tierSource).toBe("repo-metadata.yaml");
    expect(parsed.rulesets).toEqual(["base-production"]);
    expect(parsed.matchedRulesets).toEqual(["base-production"]);
  });

  it("includes error in output when invalid", () => {
    const result = {
      valid: false,
      tier: "production" as const,
      tierSource: "repo-metadata.yaml" as const,
      rulesets: ["base-internal"],
      expectedPattern: "*-production",
      matchedRulesets: [],
      error: "No ruleset matching pattern '*-production' found",
    };

    const output = formatTierResultJson(result);
    const parsed = JSON.parse(output);

    expect(parsed.valid).toBe(false);
    expect(parsed.error).toBeDefined();
  });
});

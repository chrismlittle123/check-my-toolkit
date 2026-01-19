import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Config } from "../../src/config/index.js";
import { auditInfraConfig, runInfraChecks } from "../../src/infra/index.js";

// Mock AWS SDK to prevent actual calls
vi.mock("@aws-sdk/client-resource-groups-tagging-api", () => ({
  ResourceGroupsTaggingAPIClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ ResourceTagMappingList: [] }),
  })),
  GetResourcesCommand: vi.fn(),
}));

describe("infra domain", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-infra-test-"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("runInfraChecks", () => {
    it("returns empty result when no tools enabled", async () => {
      const config: Config = {
        infra: {
          tagging: { enabled: false },
        },
      };

      const result = await runInfraChecks(tempDir, config);

      expect(result.domain).toBe("infra");
      expect(result.checks).toHaveLength(0);
    });

    it("runs tagging when enabled", async () => {
      const config: Config = {
        infra: {
          tagging: {
            enabled: true,
            region: "us-east-1",
            required: ["Environment", "Team"],
          },
        },
      };

      const result = await runInfraChecks(tempDir, config);

      expect(result.domain).toBe("infra");
      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].name).toBe("Tagging");
    });

    it("returns correct domain result structure", async () => {
      const config: Config = {
        infra: {
          tagging: { enabled: true },
        },
      };

      const result = await runInfraChecks(tempDir, config);

      expect(result).toHaveProperty("domain", "infra");
      expect(result).toHaveProperty("checks");
      expect(Array.isArray(result.checks)).toBe(true);
    });

    it("handles missing infra config", async () => {
      const config: Config = {};

      const result = await runInfraChecks(tempDir, config);

      expect(result.checks).toHaveLength(0);
    });

    it("handles undefined tagging config", async () => {
      const config: Config = {
        infra: {},
      };

      const result = await runInfraChecks(tempDir, config);

      expect(result.checks).toHaveLength(0);
    });
  });

  describe("auditInfraConfig", () => {
    it("returns empty result when no tools enabled", async () => {
      const config: Config = {
        infra: {
          tagging: { enabled: false },
        },
      };

      const result = await auditInfraConfig(tempDir, config);

      expect(result.domain).toBe("infra");
      expect(result.checks).toHaveLength(0);
    });

    it("runs audit for enabled tools", async () => {
      const config: Config = {
        infra: {
          tagging: { enabled: true },
        },
      };

      const result = await auditInfraConfig(tempDir, config);

      expect(result.domain).toBe("infra");
      expect(result.checks).toHaveLength(1);
    });
  });

  describe("tool configuration", () => {
    it("creates runner with correct config", async () => {
      const config: Config = {
        infra: {
          tagging: {
            enabled: true,
            region: "eu-west-1",
            required: ["Project", "Owner"],
            values: { Environment: ["prod", "dev", "staging"] },
          },
        },
      };

      const result = await runInfraChecks(tempDir, config);

      // Runner was created and executed
      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].rule).toBe("infra.tagging");
    });
  });
});

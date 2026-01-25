import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  mergeIntoManifest,
  parseStackExportMultiAccount,
} from "../../src/infra/generate.js";
import type {
  LegacyManifest,
  MultiAccountManifest,
} from "../../src/infra/types.js";

describe("parseStackExportMultiAccount", () => {
  const mockStackExport = {
    deployment: {
      resources: [
        {
          urn: "urn:pulumi:dev::my-project::aws:lambda/function:Function::api",
          outputs: {
            arn: "arn:aws:lambda:us-east-1:111111111111:function:api",
          },
        },
        {
          urn: "urn:pulumi:dev::my-project::aws:s3/bucket:Bucket::data",
          outputs: {
            arn: "arn:aws:s3:::my-data-bucket",
          },
        },
        {
          urn: "urn:pulumi:dev::my-project::gcp:cloudrun/service:Service::web",
          outputs: {
            name: "projects/my-gcp-project/locations/us-central1/services/web",
          },
        },
      ],
    },
  };

  it("groups resources by detected account", () => {
    const result = parseStackExportMultiAccount(mockStackExport);

    expect(result.version).toBe(2);
    expect(Object.keys(result.accounts)).toHaveLength(3);
    expect(result.accounts["aws:111111111111"]).toBeDefined();
    expect(result.accounts["aws:unknown"]).toBeDefined();
    expect(result.accounts["gcp:my-gcp-project"]).toBeDefined();
  });

  it("uses explicit account ID when provided", () => {
    const result = parseStackExportMultiAccount(mockStackExport, {
      accountId: "aws:999999999999",
    });

    expect(Object.keys(result.accounts)).toHaveLength(1);
    expect(result.accounts["aws:999999999999"]).toBeDefined();
    expect(result.accounts["aws:999999999999"].resources).toHaveLength(3);
  });

  it("applies alias to single account", () => {
    const singleAccountExport = {
      deployment: {
        resources: [
          {
            urn: "urn:pulumi:dev::my-project::aws:lambda/function:Function::api",
            outputs: {
              arn: "arn:aws:lambda:us-east-1:111111111111:function:api",
            },
          },
        ],
      },
    };

    const result = parseStackExportMultiAccount(singleAccountExport, {
      account: "prod-aws",
    });

    expect(result.accounts["aws:111111111111"].alias).toBe("prod-aws");
  });

  it("extracts project name from URN", () => {
    const result = parseStackExportMultiAccount(mockStackExport);
    expect(result.project).toBe("my-project");
  });

  it("uses provided project name", () => {
    const result = parseStackExportMultiAccount(mockStackExport, {
      project: "custom-project",
    });
    expect(result.project).toBe("custom-project");
  });

  it("throws for invalid stack export", () => {
    expect(() => parseStackExportMultiAccount(null)).toThrow(
      "Invalid stack export: expected an object"
    );
    expect(() => parseStackExportMultiAccount({})).toThrow(
      "Invalid stack export: missing deployment.resources"
    );
  });
});

describe("mergeIntoManifest", () => {
  it("merges resources into existing multi-account manifest", () => {
    const existing: MultiAccountManifest = {
      version: 2,
      project: "test",
      accounts: {
        "aws:111111111111": {
          alias: "prod",
          resources: ["arn:aws:lambda:us-east-1:111111111111:function:existing"],
        },
      },
    };

    const result = mergeIntoManifest(
      existing,
      ["arn:aws:lambda:us-east-1:111111111111:function:new"],
      "aws:111111111111"
    );

    expect(result.accounts["aws:111111111111"].resources).toHaveLength(2);
    expect(result.accounts["aws:111111111111"].alias).toBe("prod");
  });

  it("adds new account to existing manifest", () => {
    const existing: MultiAccountManifest = {
      version: 2,
      accounts: {
        "aws:111111111111": {
          resources: ["arn:aws:lambda:us-east-1:111111111111:function:api"],
        },
      },
    };

    const result = mergeIntoManifest(
      existing,
      ["arn:aws:lambda:us-east-1:222222222222:function:worker"],
      "aws:222222222222",
      "staging"
    );

    expect(Object.keys(result.accounts)).toHaveLength(2);
    expect(result.accounts["aws:222222222222"].alias).toBe("staging");
    expect(result.accounts["aws:222222222222"].resources).toHaveLength(1);
  });

  it("converts legacy manifest to multi-account", () => {
    const existing: LegacyManifest = {
      project: "legacy-project",
      resources: ["arn:aws:s3:::old-bucket"],
    };

    const result = mergeIntoManifest(
      existing,
      ["arn:aws:lambda:us-east-1:111111111111:function:new"],
      "aws:111111111111",
      "prod"
    );

    expect(result.version).toBe(2);
    expect(result.project).toBe("legacy-project");
    expect(result.accounts["aws:unknown"]).toBeDefined(); // S3 bucket without account
    expect(result.accounts["aws:111111111111"]).toBeDefined();
  });

  it("deduplicates resources when merging", () => {
    const existing: MultiAccountManifest = {
      version: 2,
      accounts: {
        "aws:111111111111": {
          resources: ["arn:aws:lambda:us-east-1:111111111111:function:api"],
        },
      },
    };

    const result = mergeIntoManifest(
      existing,
      [
        "arn:aws:lambda:us-east-1:111111111111:function:api", // duplicate
        "arn:aws:lambda:us-east-1:111111111111:function:new",
      ],
      "aws:111111111111"
    );

    expect(result.accounts["aws:111111111111"].resources).toHaveLength(2);
  });

  it("preserves existing alias when not provided", () => {
    const existing: MultiAccountManifest = {
      version: 2,
      accounts: {
        "aws:111111111111": {
          alias: "existing-alias",
          resources: [],
        },
      },
    };

    const result = mergeIntoManifest(
      existing,
      ["arn:aws:lambda:us-east-1:111111111111:function:new"],
      "aws:111111111111"
    );

    expect(result.accounts["aws:111111111111"].alias).toBe("existing-alias");
  });

  it("overrides alias when provided", () => {
    const existing: MultiAccountManifest = {
      version: 2,
      accounts: {
        "aws:111111111111": {
          alias: "old-alias",
          resources: [],
        },
      },
    };

    const result = mergeIntoManifest(
      existing,
      ["arn:aws:lambda:us-east-1:111111111111:function:new"],
      "aws:111111111111",
      "new-alias"
    );

    expect(result.accounts["aws:111111111111"].alias).toBe("new-alias");
  });
});

describe("manifest file operations", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-infra-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("reads and parses multi-account manifest", async () => {
    const manifest: MultiAccountManifest = {
      version: 2,
      project: "test",
      accounts: {
        "aws:111111111111": {
          alias: "prod",
          resources: ["arn:aws:s3:::bucket"],
        },
      },
    };

    const manifestPath = path.join(tempDir, "infra-manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    const { readManifest } = await import("../../src/infra/manifest.js");
    const result = readManifest(manifestPath);

    expect(result).toEqual(manifest);
  });

  it("reads and parses legacy manifest", async () => {
    const manifest: LegacyManifest = {
      project: "test",
      resources: ["arn:aws:s3:::bucket"],
    };

    const manifestPath = path.join(tempDir, "infra-manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    const { readManifest, isLegacyManifest } = await import(
      "../../src/infra/manifest.js"
    );
    const result = readManifest(manifestPath);

    expect(isLegacyManifest(result)).toBe(true);
  });

  it("throws for invalid account key in manifest", async () => {
    const invalidManifest = {
      version: 2,
      accounts: {
        "invalid-key": {
          resources: ["arn:aws:s3:::bucket"],
        },
      },
    };

    const manifestPath = path.join(tempDir, "infra-manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(invalidManifest, null, 2));

    const { readManifest } = await import("../../src/infra/manifest.js");

    expect(() => readManifest(manifestPath)).toThrow(
      'invalid account key: "invalid-key"'
    );
  });
});

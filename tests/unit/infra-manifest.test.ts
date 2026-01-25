import { describe, expect, it } from "vitest";

import {
  detectAccountFromResource,
  formatAccountKey,
  getAllResources,
  isLegacyManifest,
  isMultiAccountManifest,
  normalizeManifest,
  parseAccountKey,
} from "../../src/infra/manifest.js";
import type {
  LegacyManifest,
  MultiAccountManifest,
} from "../../src/infra/types.js";

describe("parseAccountKey", () => {
  it("parses AWS account key", () => {
    const result = parseAccountKey("aws:111111111111");
    expect(result).toEqual({ cloud: "aws", id: "111111111111" });
  });

  it("parses GCP account key", () => {
    const result = parseAccountKey("gcp:my-project-123");
    expect(result).toEqual({ cloud: "gcp", id: "my-project-123" });
  });

  it("returns null for invalid format", () => {
    expect(parseAccountKey("invalid")).toBeNull();
    expect(parseAccountKey("azure:123")).toBeNull();
    expect(parseAccountKey("aws")).toBeNull();
    expect(parseAccountKey(":123")).toBeNull();
  });
});

describe("formatAccountKey", () => {
  it("formats AWS account key", () => {
    expect(formatAccountKey("aws", "111111111111")).toBe("aws:111111111111");
  });

  it("formats GCP account key", () => {
    expect(formatAccountKey("gcp", "my-project")).toBe("gcp:my-project");
  });
});

describe("detectAccountFromResource", () => {
  it("detects AWS account from ARN with account ID", () => {
    const arn = "arn:aws:lambda:us-east-1:111111111111:function:my-function";
    expect(detectAccountFromResource(arn)).toBe("aws:111111111111");
  });

  it("returns aws:unknown for S3 bucket ARN without account", () => {
    const arn = "arn:aws:s3:::my-bucket";
    expect(detectAccountFromResource(arn)).toBe("aws:unknown");
  });

  it("detects GCP project from resource path", () => {
    const resource = "projects/my-project-123/locations/us-central1/services/api";
    expect(detectAccountFromResource(resource)).toBe("gcp:my-project-123");
  });

  it("returns unknown for unrecognized format", () => {
    expect(detectAccountFromResource("something-else")).toBe("unknown:unknown");
  });
});

describe("isMultiAccountManifest", () => {
  it("returns true for multi-account manifest", () => {
    const manifest: MultiAccountManifest = {
      version: 2,
      project: "test",
      accounts: {
        "aws:111111111111": { resources: [] },
      },
    };
    expect(isMultiAccountManifest(manifest)).toBe(true);
  });

  it("returns false for legacy manifest", () => {
    const manifest: LegacyManifest = {
      project: "test",
      resources: [],
    };
    expect(isMultiAccountManifest(manifest)).toBe(false);
  });
});

describe("isLegacyManifest", () => {
  it("returns true for legacy manifest", () => {
    const manifest: LegacyManifest = {
      project: "test",
      resources: ["arn:aws:s3:::bucket"],
    };
    expect(isLegacyManifest(manifest)).toBe(true);
  });

  it("returns false for multi-account manifest", () => {
    const manifest: MultiAccountManifest = {
      version: 2,
      accounts: {},
    };
    expect(isLegacyManifest(manifest)).toBe(false);
  });
});

describe("normalizeManifest", () => {
  it("returns multi-account manifest unchanged", () => {
    const manifest: MultiAccountManifest = {
      version: 2,
      project: "test",
      accounts: {
        "aws:111111111111": {
          alias: "prod",
          resources: ["arn:aws:lambda:us-east-1:111111111111:function:api"],
        },
      },
    };
    expect(normalizeManifest(manifest)).toEqual(manifest);
  });

  it("converts legacy manifest to multi-account format", () => {
    const legacy: LegacyManifest = {
      project: "test",
      resources: [
        "arn:aws:lambda:us-east-1:111111111111:function:api",
        "arn:aws:lambda:us-east-1:222222222222:function:worker",
      ],
    };

    const result = normalizeManifest(legacy);

    expect(result.version).toBe(2);
    expect(result.project).toBe("test");
    expect(Object.keys(result.accounts)).toHaveLength(2);
    expect(result.accounts["aws:111111111111"].resources).toEqual([
      "arn:aws:lambda:us-east-1:111111111111:function:api",
    ]);
    expect(result.accounts["aws:222222222222"].resources).toEqual([
      "arn:aws:lambda:us-east-1:222222222222:function:worker",
    ]);
  });

  it("groups resources by detected account", () => {
    const legacy: LegacyManifest = {
      resources: [
        "arn:aws:s3:::bucket-a",
        "arn:aws:s3:::bucket-b",
        "projects/my-gcp-project/locations/us/services/api",
      ],
    };

    const result = normalizeManifest(legacy);

    expect(result.accounts["aws:unknown"]).toBeDefined();
    expect(result.accounts["aws:unknown"].resources).toHaveLength(2);
    expect(result.accounts["gcp:my-gcp-project"]).toBeDefined();
    expect(result.accounts["gcp:my-gcp-project"].resources).toHaveLength(1);
  });
});

describe("getAllResources", () => {
  it("returns resources from legacy manifest", () => {
    const manifest: LegacyManifest = {
      resources: ["arn:aws:s3:::bucket-a", "arn:aws:s3:::bucket-b"],
    };

    expect(getAllResources(manifest)).toEqual([
      "arn:aws:s3:::bucket-a",
      "arn:aws:s3:::bucket-b",
    ]);
  });

  it("flattens resources from multi-account manifest", () => {
    const manifest: MultiAccountManifest = {
      version: 2,
      accounts: {
        "aws:111111111111": {
          resources: ["arn:aws:lambda:us-east-1:111111111111:function:a"],
        },
        "aws:222222222222": {
          resources: [
            "arn:aws:lambda:us-east-1:222222222222:function:b",
            "arn:aws:lambda:us-east-1:222222222222:function:c",
          ],
        },
      },
    };

    const result = getAllResources(manifest);

    expect(result).toHaveLength(3);
    expect(result).toContain("arn:aws:lambda:us-east-1:111111111111:function:a");
    expect(result).toContain("arn:aws:lambda:us-east-1:222222222222:function:b");
    expect(result).toContain("arn:aws:lambda:us-east-1:222222222222:function:c");
  });
});

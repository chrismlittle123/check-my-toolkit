/**
 * Tests for Zod schema validation in infra module
 */

import { describe, expect, it } from "vitest";

import {
  // Validation functions
  isValidArnFormat,
  isValidGcpResourcePath,
  isValidAccountKey,
  isMultiAccountManifestSchema,
  isLegacyManifestSchema,
  validateArn,
  validateGcpResourcePath,
  validateAccountKey,
  validateManifest,
  validateMultiAccountManifest,
  validateLegacyManifest,
  validateStackExport,
  // Schemas for direct testing
  ArnSchema,
  GcpResourcePathSchema,
  AccountKeySchema,
  ManifestSchema,
} from "../../../src/infra/types.js";

describe("ARN Schema Validation", () => {
  describe("isValidArnFormat", () => {
    it("should accept valid AWS ARNs", () => {
      expect(isValidArnFormat("arn:aws:s3:::my-bucket")).toBe(true);
      expect(isValidArnFormat("arn:aws:lambda:us-east-1:123456789012:function:my-function")).toBe(true);
      expect(isValidArnFormat("arn:aws:dynamodb:us-west-2:123456789012:table/my-table")).toBe(true);
      expect(isValidArnFormat("arn:aws:iam::123456789012:role/my-role")).toBe(true);
      expect(isValidArnFormat("arn:aws:sqs:us-east-1:123456789012:my-queue")).toBe(true);
    });

    it("should accept ARNs with different partitions", () => {
      expect(isValidArnFormat("arn:aws-cn:s3:::my-bucket")).toBe(true);
      expect(isValidArnFormat("arn:aws-us-gov:s3:::my-bucket")).toBe(true);
    });

    it("should reject invalid ARN formats", () => {
      expect(isValidArnFormat("not-an-arn")).toBe(false);
      expect(isValidArnFormat("arn:invalid:s3:::bucket")).toBe(false);
      expect(isValidArnFormat("arn:aws")).toBe(false);
      expect(isValidArnFormat("")).toBe(false);
    });
  });

  describe("validateArn", () => {
    it("should return validated ARN for valid input", () => {
      const arn = "arn:aws:s3:::my-bucket";
      expect(validateArn(arn)).toBe(arn);
    });

    it("should throw ZodError for invalid input", () => {
      expect(() => validateArn("not-an-arn")).toThrow();
    });
  });
});

describe("GCP Resource Path Schema Validation", () => {
  describe("isValidGcpResourcePath", () => {
    it("should accept valid GCP resource paths", () => {
      expect(isValidGcpResourcePath("projects/my-project/locations/us-central1/services/api")).toBe(true);
      expect(isValidGcpResourcePath("projects/my-project/topics/my-topic")).toBe(true);
      expect(isValidGcpResourcePath("projects/my-project/subscriptions/my-sub")).toBe(true);
      expect(isValidGcpResourcePath("projects/my-project/secrets/my-secret")).toBe(true);
    });

    it("should reject invalid GCP resource paths", () => {
      expect(isValidGcpResourcePath("not-a-path")).toBe(false);
      expect(isValidGcpResourcePath("projects/")).toBe(false);
      expect(isValidGcpResourcePath("projects/my-project")).toBe(false);
      expect(isValidGcpResourcePath("")).toBe(false);
    });
  });

  describe("validateGcpResourcePath", () => {
    it("should return validated path for valid input", () => {
      const path = "projects/my-project/locations/us-central1/services/api";
      expect(validateGcpResourcePath(path)).toBe(path);
    });

    it("should throw ZodError for invalid input", () => {
      expect(() => validateGcpResourcePath("not-a-path")).toThrow();
    });
  });
});

describe("Account Key Schema Validation", () => {
  describe("isValidAccountKey", () => {
    it("should accept valid AWS account keys", () => {
      expect(isValidAccountKey("aws:123456789012")).toBe(true);
      expect(isValidAccountKey("aws:111111111111")).toBe(true);
    });

    it("should accept valid GCP project keys", () => {
      expect(isValidAccountKey("gcp:my-project")).toBe(true);
      expect(isValidAccountKey("gcp:my-project-123")).toBe(true);
    });

    it("should reject invalid account keys", () => {
      expect(isValidAccountKey("azure:123")).toBe(false);
      expect(isValidAccountKey("aws")).toBe(false);
      expect(isValidAccountKey("aws:")).toBe(false);
      expect(isValidAccountKey(":123")).toBe(false);
      expect(isValidAccountKey("")).toBe(false);
    });
  });

  describe("validateAccountKey", () => {
    it("should return validated key for valid input", () => {
      expect(validateAccountKey("aws:123456789012")).toBe("aws:123456789012");
      expect(validateAccountKey("gcp:my-project")).toBe("gcp:my-project");
    });

    it("should throw ZodError for invalid input", () => {
      expect(() => validateAccountKey("invalid")).toThrow();
    });
  });
});

describe("Manifest Schema Validation", () => {
  describe("isLegacyManifestSchema (v1)", () => {
    it("should accept valid legacy manifests", () => {
      expect(isLegacyManifestSchema({
        resources: ["arn:aws:s3:::my-bucket"]
      })).toBe(true);

      expect(isLegacyManifestSchema({
        version: 1,
        project: "my-project",
        resources: ["arn:aws:s3:::my-bucket"]
      })).toBe(true);
    });

    it("should reject invalid legacy manifests", () => {
      expect(isLegacyManifestSchema({})).toBe(false);
      expect(isLegacyManifestSchema({ resources: "not-an-array" })).toBe(false);
      expect(isLegacyManifestSchema({ version: 2, resources: [] })).toBe(false);
    });
  });

  describe("isMultiAccountManifestSchema (v2)", () => {
    it("should accept valid multi-account manifests", () => {
      expect(isMultiAccountManifestSchema({
        version: 2,
        accounts: {
          "aws:123456789012": {
            resources: ["arn:aws:s3:::my-bucket"]
          }
        }
      })).toBe(true);

      expect(isMultiAccountManifestSchema({
        version: 2,
        project: "my-project",
        accounts: {
          "aws:123456789012": {
            alias: "prod",
            resources: ["arn:aws:s3:::my-bucket"]
          },
          "gcp:my-project": {
            resources: ["projects/my-project/topics/my-topic"]
          }
        }
      })).toBe(true);
    });

    it("should reject invalid multi-account manifests", () => {
      expect(isMultiAccountManifestSchema({})).toBe(false);
      expect(isMultiAccountManifestSchema({ version: 1 })).toBe(false);
      expect(isMultiAccountManifestSchema({ version: 2 })).toBe(false);
      expect(isMultiAccountManifestSchema({ version: 2, accounts: "not-an-object" })).toBe(false);
    });
  });

  describe("validateManifest", () => {
    it("should validate legacy manifest", () => {
      const manifest = {
        project: "test",
        resources: ["arn:aws:s3:::bucket"]
      };
      const result = validateManifest(manifest);
      expect(result).toEqual(manifest);
    });

    it("should validate multi-account manifest", () => {
      const manifest = {
        version: 2 as const,
        project: "test",
        accounts: {
          "aws:123": {
            alias: "prod",
            resources: ["arn:aws:s3:::bucket"]
          }
        }
      };
      const result = validateManifest(manifest);
      expect(result).toEqual(manifest);
    });

    it("should throw for invalid manifest", () => {
      expect(() => validateManifest({})).toThrow();
      expect(() => validateManifest({ invalid: true })).toThrow();
    });
  });

  describe("validateMultiAccountManifest", () => {
    it("should validate valid multi-account manifest", () => {
      const manifest = {
        version: 2 as const,
        accounts: {
          "aws:123": { resources: [] }
        }
      };
      expect(validateMultiAccountManifest(manifest)).toEqual(manifest);
    });

    it("should throw for legacy manifest", () => {
      expect(() => validateMultiAccountManifest({ resources: [] })).toThrow();
    });
  });

  describe("validateLegacyManifest", () => {
    it("should validate valid legacy manifest", () => {
      const manifest = { resources: ["arn:aws:s3:::bucket"] };
      expect(validateLegacyManifest(manifest)).toEqual(manifest);
    });

    it("should throw for multi-account manifest", () => {
      expect(() => validateLegacyManifest({
        version: 2,
        accounts: {}
      })).toThrow();
    });
  });
});

describe("Pulumi Stack Export Schema Validation", () => {
  describe("validateStackExport", () => {
    it("should validate empty stack export", () => {
      const result = validateStackExport({});
      expect(result).toEqual({});
    });

    it("should validate stack export with resources", () => {
      const stackExport = {
        version: 3,
        deployment: {
          manifest: {
            time: "2024-01-01T00:00:00Z",
            version: "v3.100.0"
          },
          resources: [
            {
              urn: "urn:pulumi:prod::my-stack::aws:s3/bucket:Bucket::my-bucket",
              type: "aws:s3/bucket:Bucket",
              outputs: {
                arn: "arn:aws:s3:::my-bucket"
              }
            }
          ]
        }
      };
      const result = validateStackExport(stackExport);
      expect(result.version).toBe(3);
      expect(result.deployment?.resources).toHaveLength(1);
    });

    it("should validate minimal resource", () => {
      const stackExport = {
        deployment: {
          resources: [{}]
        }
      };
      const result = validateStackExport(stackExport);
      expect(result.deployment?.resources).toHaveLength(1);
    });
  });
});

describe("Schema Parsing", () => {
  it("should parse ARN with safeParse", () => {
    const valid = ArnSchema.safeParse("arn:aws:s3:::bucket");
    expect(valid.success).toBe(true);

    const invalid = ArnSchema.safeParse("not-an-arn");
    expect(invalid.success).toBe(false);
  });

  it("should parse GCP path with safeParse", () => {
    const valid = GcpResourcePathSchema.safeParse("projects/proj/topics/topic");
    expect(valid.success).toBe(true);

    const invalid = GcpResourcePathSchema.safeParse("invalid");
    expect(invalid.success).toBe(false);
  });

  it("should parse account key with safeParse", () => {
    const valid = AccountKeySchema.safeParse("aws:123");
    expect(valid.success).toBe(true);

    const invalid = AccountKeySchema.safeParse("invalid");
    expect(invalid.success).toBe(false);
  });

  it("should parse manifest with safeParse", () => {
    const validLegacy = ManifestSchema.safeParse({ resources: [] });
    expect(validLegacy.success).toBe(true);

    const validMulti = ManifestSchema.safeParse({
      version: 2,
      accounts: { "aws:123": { resources: [] } }
    });
    expect(validMulti.success).toBe(true);

    const invalid = ManifestSchema.safeParse({ invalid: true });
    expect(invalid.success).toBe(false);
  });
});

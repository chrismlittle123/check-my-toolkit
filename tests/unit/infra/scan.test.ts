import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clearCheckerCache } from "../../../src/infra/checkers/index.js";
import { scanManifest } from "../../../src/infra/scan.js";
import type { Manifest } from "../../../src/infra/types.js";

const s3Mock = mockClient(S3Client);

describe("scanManifest", () => {
  beforeEach(() => {
    s3Mock.reset();
    clearCheckerCache();
  });

  afterEach(() => {
    s3Mock.reset();
  });

  it("should scan all resources and return summary", async () => {
    // Mock S3 responses - first bucket exists, second doesn't
    s3Mock
      .on(HeadBucketCommand, { Bucket: "existing-bucket" })
      .resolves({})
      .on(HeadBucketCommand, { Bucket: "missing-bucket" })
      .rejects(Object.assign(new Error("Not Found"), { name: "NotFound" }));

    const manifest: Manifest = {
      project: "test-project",
      resources: ["arn:aws:s3:::existing-bucket", "arn:aws:s3:::missing-bucket"],
    };

    const result = await scanManifest(manifest, "/path/to/manifest.json");

    expect(result.manifest).toBe("/path/to/manifest.json");
    expect(result.project).toBe("test-project");
    expect(result.summary).toEqual({
      total: 2,
      found: 1,
      missing: 1,
      errors: 0,
    });
  });

  it("should handle unsupported services", async () => {
    const manifest: Manifest = {
      resources: ["arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0"],
    };

    const result = await scanManifest(manifest, "/path/to/manifest.json");

    expect(result.summary.errors).toBe(1);
    expect(result.results[0].error).toContain("Unsupported service");
  });

  it("should handle invalid ARNs", async () => {
    const manifest: Manifest = {
      resources: ["not-an-arn"],
    };

    const result = await scanManifest(manifest, "/path/to/manifest.json");

    expect(result.summary.errors).toBe(1);
    expect(result.results[0].error).toBe("Invalid ARN format");
  });

  it("should sort results by ARN", async () => {
    s3Mock.on(HeadBucketCommand).resolves({});

    const manifest: Manifest = {
      resources: ["arn:aws:s3:::zebra-bucket", "arn:aws:s3:::alpha-bucket"],
    };

    const result = await scanManifest(manifest, "/path/to/manifest.json");

    expect(result.results[0].arn).toBe("arn:aws:s3:::alpha-bucket");
    expect(result.results[1].arn).toBe("arn:aws:s3:::zebra-bucket");
  });

  it("should handle empty manifest", async () => {
    const manifest: Manifest = {
      resources: [],
    };

    const result = await scanManifest(manifest, "/path/to/manifest.json");

    expect(result.summary).toEqual({
      total: 0,
      found: 0,
      missing: 0,
      errors: 0,
    });
    expect(result.results).toEqual([]);
  });
});

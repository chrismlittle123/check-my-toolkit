import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseArn } from "../../../../src/infra/arn.js";
import { S3Checker } from "../../../../src/infra/checkers/s3.js";

const s3Mock = mockClient(S3Client);

describe("S3Checker", () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  afterEach(() => {
    s3Mock.reset();
  });

  it("should return exists: true when bucket exists", async () => {
    s3Mock.on(HeadBucketCommand).resolves({});

    const arn = parseArn("arn:aws:s3:::my-bucket")!;
    const result = await S3Checker.check(arn);

    expect(result).toEqual({
      arn: "arn:aws:s3:::my-bucket",
      exists: true,
      service: "s3",
      resourceType: "bucket",
      resourceId: "my-bucket",
    });
  });

  it("should return exists: false when bucket does not exist", async () => {
    const notFoundError = new Error("Not Found");
    notFoundError.name = "NotFound";
    s3Mock.on(HeadBucketCommand).rejects(notFoundError);

    const arn = parseArn("arn:aws:s3:::nonexistent-bucket")!;
    const result = await S3Checker.check(arn);

    expect(result).toEqual({
      arn: "arn:aws:s3:::nonexistent-bucket",
      exists: false,
      service: "s3",
      resourceType: "bucket",
      resourceId: "nonexistent-bucket",
    });
  });

  it("should return exists: false when access denied (for drift detection of owned resources)", async () => {
    // For drift detection, 403 means the bucket doesn't exist or we don't own it
    // S3 returns 403 instead of 404 to prevent bucket enumeration
    const accessDeniedError = new Error("Access Denied");
    accessDeniedError.name = "AccessDenied";
    s3Mock.on(HeadBucketCommand).rejects(accessDeniedError);

    const arn = parseArn("arn:aws:s3:::restricted-bucket")!;
    const result = await S3Checker.check(arn);

    expect(result).toEqual({
      arn: "arn:aws:s3:::restricted-bucket",
      exists: false,
      service: "s3",
      resourceType: "bucket",
      resourceId: "restricted-bucket",
    });
  });

  it("should return error for other errors", async () => {
    const otherError = new Error("Connection timeout");
    otherError.name = "TimeoutError";
    s3Mock.on(HeadBucketCommand).rejects(otherError);

    const arn = parseArn("arn:aws:s3:::some-bucket")!;
    const result = await S3Checker.check(arn);

    expect(result.exists).toBe(false);
    expect(result.error).toBe("Connection timeout");
  });

  it("should check bucket existence for S3 object ARNs", async () => {
    s3Mock.on(HeadBucketCommand).resolves({});

    const arn = parseArn("arn:aws:s3:::my-bucket/path/to/object.txt")!;
    const result = await S3Checker.check(arn);

    expect(result.exists).toBe(true);
    expect(result.resourceType).toBe("bucket");
    expect(result.resourceId).toBe("my-bucket");
  });
});

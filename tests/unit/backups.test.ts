import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it } from "vitest";

import { BackupsRunner } from "../../src/process/tools/backups.js";

const s3Mock = mockClient(S3Client);

describe("BackupsRunner", () => {
  let runner: BackupsRunner;

  beforeEach(() => {
    s3Mock.reset();
    runner = new BackupsRunner();
  });

  it("has correct metadata", () => {
    expect(runner.name).toBe("Backups");
    expect(runner.rule).toBe("process.backups");
    expect(runner.toolId).toBe("backups");
  });

  it("skips when no bucket configured", async () => {
    runner.setConfig({ enabled: true });

    const result = await runner.run("/tmp");

    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("No bucket configured");
  });

  it("passes when recent backup exists", async () => {
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [{ Key: "backup.tar.gz", LastModified: new Date() }],
    });

    runner.setConfig({ enabled: true, bucket: "test-bucket" });
    runner.setS3Client(new S3Client({}));

    const result = await runner.run("/tmp");

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("fails when no backups exist", async () => {
    s3Mock.on(ListObjectsV2Command).resolves({ Contents: [] });

    runner.setConfig({ enabled: true, bucket: "test-bucket" });
    runner.setS3Client(new S3Client({}));

    const result = await runner.run("/tmp");

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].rule).toBe("process.backups.exists");
    expect(result.violations[0].message).toContain("No backups found");
  });

  it("fails when backup is too old", async () => {
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [{ Key: "backup.tar.gz", LastModified: oldDate }],
    });

    runner.setConfig({ enabled: true, bucket: "test-bucket", max_age_hours: 24 });
    runner.setS3Client(new S3Client({}));

    const result = await runner.run("/tmp");

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].rule).toBe("process.backups.recency");
    expect(result.violations[0].message).toContain("48 hours old");
    expect(result.violations[0].message).toContain("max: 24 hours");
  });

  it("uses most recent backup for age check", async () => {
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
    const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [
        { Key: "old-backup.tar.gz", LastModified: oldDate },
        { Key: "recent-backup.tar.gz", LastModified: recentDate },
      ],
    });

    runner.setConfig({ enabled: true, bucket: "test-bucket", max_age_hours: 24 });
    runner.setS3Client(new S3Client({}));

    const result = await runner.run("/tmp");

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("includes prefix in S3 request", async () => {
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [{ Key: "github/myorg/myrepo/backup.tar.gz", LastModified: new Date() }],
    });

    runner.setConfig({
      enabled: true,
      bucket: "test-bucket",
      prefix: "github/myorg/myrepo",
    });
    runner.setS3Client(new S3Client({}));

    await runner.run("/tmp");

    const calls = s3Mock.commandCalls(ListObjectsV2Command);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toEqual({
      Bucket: "test-bucket",
      Prefix: "github/myorg/myrepo",
    });
  });

  it("handles S3 errors gracefully", async () => {
    s3Mock.on(ListObjectsV2Command).rejects(new Error("Access Denied"));

    runner.setConfig({ enabled: true, bucket: "test-bucket" });
    runner.setS3Client(new S3Client({}));

    const result = await runner.run("/tmp");

    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain("S3 error");
    expect(result.skipReason).toContain("Access Denied");
  });

  it("fails when Contents is undefined", async () => {
    s3Mock.on(ListObjectsV2Command).resolves({});

    runner.setConfig({ enabled: true, bucket: "test-bucket" });
    runner.setS3Client(new S3Client({}));

    const result = await runner.run("/tmp");

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].rule).toBe("process.backups.exists");
  });

  it("handles objects without LastModified", async () => {
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [{ Key: "backup.tar.gz" }], // No LastModified
    });

    runner.setConfig({ enabled: true, bucket: "test-bucket" });
    runner.setS3Client(new S3Client({}));

    const result = await runner.run("/tmp");

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].rule).toBe("process.backups.recency");
    expect(result.violations[0].message).toContain("Could not determine backup age");
  });

  it("uses default max_age_hours of 24", async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [{ Key: "backup.tar.gz", LastModified: oldDate }],
    });

    runner.setConfig({ enabled: true, bucket: "test-bucket" }); // No max_age_hours
    runner.setS3Client(new S3Client({}));

    const result = await runner.run("/tmp");

    expect(result.passed).toBe(false);
    expect(result.violations[0].message).toContain("max: 24 hours");
  });
});

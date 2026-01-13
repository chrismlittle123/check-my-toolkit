import {
  GetResourcesCommand,
  ResourceGroupsTaggingAPIClient,
} from "@aws-sdk/client-resource-groups-tagging-api";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it } from "vitest";

import { TaggingRunner } from "../../src/infra/tools/tagging.js";

const taggingMock = mockClient(ResourceGroupsTaggingAPIClient);

describe("TaggingRunner", () => {
  let runner: TaggingRunner;

  beforeEach(() => {
    taggingMock.reset();
    runner = new TaggingRunner();
  });

  it("has correct metadata", () => {
    expect(runner.name).toBe("Tagging");
    expect(runner.rule).toBe("infra.tagging");
    expect(runner.toolId).toBe("tagging");
  });

  it("skips when no required tags configured", async () => {
    runner.setConfig({ enabled: true });
    const result = await runner.run("/tmp");
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toBe("No required tags configured");
  });

  it("skips when required tags is empty array", async () => {
    runner.setConfig({ enabled: true, required: [] });
    const result = await runner.run("/tmp");
    expect(result.skipped).toBe(true);
  });

  it("passes when all resources have required tags", async () => {
    taggingMock.on(GetResourcesCommand).resolves({
      ResourceTagMappingList: [{
        ResourceARN: "arn:aws:s3:::my-bucket",
        Tags: [
          { Key: "Environment", Value: "prod" },
          { Key: "Owner", Value: "team-a" },
        ],
      }],
    });

    runner.setConfig({ enabled: true, required: ["Environment", "Owner"] });
    runner.setClient(new ResourceGroupsTaggingAPIClient({}));

    const result = await runner.run("/tmp");
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("passes when no resources found", async () => {
    taggingMock.on(GetResourcesCommand).resolves({
      ResourceTagMappingList: [],
    });

    runner.setConfig({ enabled: true, required: ["Environment"] });
    runner.setClient(new ResourceGroupsTaggingAPIClient({}));

    const result = await runner.run("/tmp");
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("fails when resources are missing required tags", async () => {
    taggingMock.on(GetResourcesCommand).resolves({
      ResourceTagMappingList: [{
        ResourceARN: "arn:aws:s3:::my-bucket",
        Tags: [{ Key: "Environment", Value: "prod" }],
      }],
    });

    runner.setConfig({ enabled: true, required: ["Environment", "Owner", "CostCenter"] });
    runner.setClient(new ResourceGroupsTaggingAPIClient({}));

    const result = await runner.run("/tmp");
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].rule).toBe("infra.tagging.required");
    expect(result.violations[0].message).toContain("Owner");
    expect(result.violations[0].message).toContain("CostCenter");
    expect(result.violations[0].file).toBe("arn:aws:s3:::my-bucket");
  });

  it("fails when tag value is not in allowed list", async () => {
    taggingMock.on(GetResourcesCommand).resolves({
      ResourceTagMappingList: [{
        ResourceARN: "arn:aws:s3:::my-bucket",
        Tags: [{ Key: "Environment", Value: "production" }],
      }],
    });

    runner.setConfig({
      enabled: true,
      required: ["Environment"],
      values: { Environment: ["dev", "stag", "prod"] },
    });
    runner.setClient(new ResourceGroupsTaggingAPIClient({}));

    const result = await runner.run("/tmp");
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].rule).toBe("infra.tagging.values");
    expect(result.violations[0].message).toContain("production");
    expect(result.violations[0].message).toContain("dev, stag, prod");
  });

  it("passes when tag value is in allowed list", async () => {
    taggingMock.on(GetResourcesCommand).resolves({
      ResourceTagMappingList: [{
        ResourceARN: "arn:aws:s3:::my-bucket",
        Tags: [{ Key: "Environment", Value: "prod" }],
      }],
    });

    runner.setConfig({
      enabled: true,
      required: ["Environment"],
      values: { Environment: ["dev", "stag", "prod"] },
    });
    runner.setClient(new ResourceGroupsTaggingAPIClient({}));

    const result = await runner.run("/tmp");
    expect(result.passed).toBe(true);
  });

  it("handles multiple resources with violations", async () => {
    taggingMock.on(GetResourcesCommand).resolves({
      ResourceTagMappingList: [
        {
          ResourceARN: "arn:aws:s3:::bucket-1",
          Tags: [], // Missing Environment
        },
        {
          ResourceARN: "arn:aws:s3:::bucket-2",
          Tags: [{ Key: "Environment", Value: "invalid" }],
        },
      ],
    });

    runner.setConfig({
      enabled: true,
      required: ["Environment"],
      values: { Environment: ["dev", "prod"] },
    });
    runner.setClient(new ResourceGroupsTaggingAPIClient({}));

    const result = await runner.run("/tmp");
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(2);
    expect(result.violations[0].rule).toBe("infra.tagging.required");
    expect(result.violations[1].rule).toBe("infra.tagging.values");
  });

  it("handles pagination", async () => {
    taggingMock
      .on(GetResourcesCommand)
      .resolvesOnce({
        ResourceTagMappingList: [{
          ResourceARN: "arn:aws:s3:::bucket-1",
          Tags: [{ Key: "Environment", Value: "prod" }],
        }],
        PaginationToken: "token-1",
      })
      .resolvesOnce({
        ResourceTagMappingList: [{
          ResourceARN: "arn:aws:s3:::bucket-2",
          Tags: [{ Key: "Environment", Value: "prod" }],
        }],
      });

    runner.setConfig({ enabled: true, required: ["Environment"] });
    runner.setClient(new ResourceGroupsTaggingAPIClient({}));

    const result = await runner.run("/tmp");
    expect(result.passed).toBe(true);
    expect(taggingMock.calls()).toHaveLength(2);
  });

  it("handles AWS errors gracefully", async () => {
    taggingMock.on(GetResourcesCommand).rejects(new Error("Access Denied"));

    runner.setConfig({ enabled: true, required: ["Environment"] });
    runner.setClient(new ResourceGroupsTaggingAPIClient({}));

    const result = await runner.run("/tmp");
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain("AWS error");
    expect(result.skipReason).toContain("Access Denied");
  });

  it("handles resource with undefined ARN", async () => {
    taggingMock.on(GetResourcesCommand).resolves({
      ResourceTagMappingList: [{
        // No ResourceARN
        Tags: [],
      }],
    });

    runner.setConfig({ enabled: true, required: ["Environment"] });
    runner.setClient(new ResourceGroupsTaggingAPIClient({}));

    const result = await runner.run("/tmp");
    expect(result.passed).toBe(false);
    expect(result.violations[0].file).toBe("unknown");
  });

  it("audit delegates to run", async () => {
    taggingMock.on(GetResourcesCommand).resolves({
      ResourceTagMappingList: [{
        ResourceARN: "arn:aws:s3:::my-bucket",
        Tags: [{ Key: "Environment", Value: "prod" }],
      }],
    });

    runner.setConfig({ enabled: true, required: ["Environment"] });
    runner.setClient(new ResourceGroupsTaggingAPIClient({}));

    const result = await runner.audit("/tmp");
    expect(result.passed).toBe(true);
  });
});

import {
  GetResourcesCommand,
  ResourceGroupsTaggingAPIClient,
  type ResourceTagMapping,
} from "@aws-sdk/client-resource-groups-tagging-api";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseInfraToolRunner } from "./base.js";

/** Tagging configuration */
interface TaggingConfig {
  enabled?: boolean;
  region?: string;
  required?: string[];
  values?: Record<string, string[]>;
}

/**
 * Runner for AWS resource tagging validation.
 * Checks that all resources have required tags with valid values.
 */
export class TaggingRunner extends BaseInfraToolRunner {
  readonly name = "Tagging";
  readonly rule = "infra.tagging";
  readonly toolId = "tagging";

  private config: TaggingConfig = { enabled: false };
  private client: ResourceGroupsTaggingAPIClient | null = null;

  setConfig(config: TaggingConfig): void {
    this.config = { ...this.config, ...config };
  }

  /** Allow injecting client for testing */
  setClient(client: ResourceGroupsTaggingAPIClient): void {
    this.client = client;
  }

  async run(_projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    if (!this.config.required || this.config.required.length === 0) {
      return this.skip("No required tags configured", elapsed());
    }

    try {
      const violations = await this.checkTagging();
      return this.fromViolations(violations, elapsed());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.skip(`AWS error: ${message}`, elapsed());
    }
  }

  private async checkTagging(): Promise<Violation[]> {
    const client = this.getClient();
    const resources = await this.fetchAllResources(client);

    if (resources.length === 0) {
      return [];
    }

    const violations: Violation[] = [];
    for (const resource of resources) {
      violations.push(...this.checkResource(resource));
    }
    return violations;
  }

  private getClient(): ResourceGroupsTaggingAPIClient {
    return (
      this.client ??
      new ResourceGroupsTaggingAPIClient({
        region: this.config.region ?? process.env.AWS_REGION ?? "us-east-1",
      })
    );
  }

  private async fetchAllResources(
    client: ResourceGroupsTaggingAPIClient
  ): Promise<ResourceTagMapping[]> {
    const resources: ResourceTagMapping[] = [];
    let paginationToken: string | undefined;

    do {
      // eslint-disable-next-line no-await-in-loop -- Sequential pagination required
      const response = await client.send(
        new GetResourcesCommand({
          PaginationToken: paginationToken,
        })
      );

      if (response.ResourceTagMappingList) {
        resources.push(...response.ResourceTagMappingList);
      }
      paginationToken = response.PaginationToken;
    } while (paginationToken);

    return resources;
  }

  private checkResource(resource: ResourceTagMapping): Violation[] {
    const violations: Violation[] = [];
    const arn = resource.ResourceARN ?? "unknown";
    const tags = new Map(resource.Tags?.map((t) => [t.Key, t.Value]) ?? []);

    violations.push(...this.checkRequiredTags(arn, tags));
    violations.push(...this.checkTagValues(arn, tags));

    return violations;
  }

  private checkRequiredTags(
    arn: string,
    tags: Map<string | undefined, string | undefined>
  ): Violation[] {
    const missingTags = this.config.required?.filter((tag) => !tags.has(tag)) ?? [];
    if (missingTags.length === 0) {
      return [];
    }

    return [
      {
        rule: `${this.rule}.required`,
        tool: this.toolId,
        message: `Missing required tags: ${missingTags.join(", ")}`,
        severity: "error",
        file: arn,
      },
    ];
  }

  private checkTagValues(
    arn: string,
    tags: Map<string | undefined, string | undefined>
  ): Violation[] {
    if (!this.config.values) {
      return [];
    }

    const violations: Violation[] = [];
    for (const [tagKey, allowedValues] of Object.entries(this.config.values)) {
      const tagValue = tags.get(tagKey);
      if (tagValue && !allowedValues.includes(tagValue)) {
        violations.push({
          rule: `${this.rule}.values`,
          tool: this.toolId,
          message: `Invalid value for ${tagKey}: "${tagValue}" (allowed: ${allowedValues.join(", ")})`,
          severity: "error",
          file: arn,
        });
      }
    }
    return violations;
  }
}

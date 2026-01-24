import { describe, it, expect } from "vitest";
import { parseStackExport } from "../../../src/infra/generate.js";

describe("infra/generate", () => {
  describe("parseStackExport", () => {
    it("extracts AWS ARNs from resource outputs", () => {
      const stackExport = {
        deployment: {
          resources: [
            {
              urn: "urn:pulumi:dev::my-project::aws:s3/bucket:Bucket::data-bucket",
              type: "aws:s3/bucket:Bucket",
              outputs: {
                arn: "arn:aws:s3:::my-data-bucket",
                bucket: "my-data-bucket",
              },
            },
            {
              urn: "urn:pulumi:dev::my-project::aws:lambda/function:Function::processor",
              type: "aws:lambda/function:Function",
              outputs: {
                arn: "arn:aws:lambda:us-east-1:123456789012:function:processor",
                functionArn: "arn:aws:lambda:us-east-1:123456789012:function:processor",
                roleArn: "arn:aws:iam::123456789012:role/processor-role",
              },
            },
          ],
        },
      };

      const manifest = parseStackExport(stackExport);

      expect(manifest.project).toBe("my-project");
      expect(manifest.resources).toContain("arn:aws:s3:::my-data-bucket");
      expect(manifest.resources).toContain("arn:aws:lambda:us-east-1:123456789012:function:processor");
      expect(manifest.resources).toContain("arn:aws:iam::123456789012:role/processor-role");
    });

    it("extracts GCP resource paths from outputs", () => {
      const stackExport = {
        deployment: {
          resources: [
            {
              urn: "urn:pulumi:dev::my-project::gcp:cloudrun/service:Service::api",
              type: "gcp:cloudrun/service:Service",
              outputs: {
                name: "projects/my-gcp-project/locations/us-central1/services/api",
              },
            },
            {
              urn: "urn:pulumi:dev::my-project::gcp:secretmanager/secret:Secret::config",
              type: "gcp:secretmanager/secret:Secret",
              outputs: {
                name: "projects/my-gcp-project/secrets/config",
              },
            },
          ],
        },
      };

      const manifest = parseStackExport(stackExport);

      expect(manifest.project).toBe("my-project");
      expect(manifest.resources).toContain("projects/my-gcp-project/locations/us-central1/services/api");
      expect(manifest.resources).toContain("projects/my-gcp-project/secrets/config");
    });

    it("deduplicates resources", () => {
      const stackExport = {
        deployment: {
          resources: [
            {
              urn: "urn:pulumi:dev::my-project::aws:s3/bucket:Bucket::bucket1",
              outputs: {
                arn: "arn:aws:s3:::my-bucket",
              },
            },
            {
              urn: "urn:pulumi:dev::my-project::aws:s3/bucketPolicy:BucketPolicy::policy1",
              outputs: {
                // Same ARN referenced in policy
                id: "arn:aws:s3:::my-bucket",
              },
            },
          ],
        },
      };

      const manifest = parseStackExport(stackExport);

      // Should only appear once
      const bucketCount = manifest.resources.filter((r) => r === "arn:aws:s3:::my-bucket").length;
      expect(bucketCount).toBe(1);
    });

    it("uses provided project name over extracted one", () => {
      const stackExport = {
        deployment: {
          resources: [
            {
              urn: "urn:pulumi:dev::extracted-project::aws:s3/bucket:Bucket::bucket",
              outputs: {
                arn: "arn:aws:s3:::my-bucket",
              },
            },
          ],
        },
      };

      const manifest = parseStackExport(stackExport, "override-project");

      expect(manifest.project).toBe("override-project");
    });

    it("throws on invalid stack export", () => {
      expect(() => parseStackExport(null)).toThrow("Invalid stack export");
      expect(() => parseStackExport({})).toThrow("missing deployment.resources");
      expect(() => parseStackExport({ deployment: {} })).toThrow("missing deployment.resources");
    });

    it("returns empty resources for stack with no outputs", () => {
      const stackExport = {
        deployment: {
          resources: [
            {
              urn: "urn:pulumi:dev::my-project::pulumi:pulumi:Stack::my-project-dev",
              type: "pulumi:pulumi:Stack",
            },
          ],
        },
      };

      const manifest = parseStackExport(stackExport);

      expect(manifest.resources).toEqual([]);
    });

    it("ignores non-ARN/non-GCP values in outputs", () => {
      const stackExport = {
        deployment: {
          resources: [
            {
              urn: "urn:pulumi:dev::my-project::aws:s3/bucket:Bucket::bucket",
              outputs: {
                arn: "arn:aws:s3:::my-bucket",
                bucket: "my-bucket", // Not an ARN
                region: "us-east-1", // Not an ARN
                tags: { Name: "test" }, // Not a string
              },
            },
          ],
        },
      };

      const manifest = parseStackExport(stackExport);

      expect(manifest.resources).toEqual(["arn:aws:s3:::my-bucket"]);
    });
  });
});

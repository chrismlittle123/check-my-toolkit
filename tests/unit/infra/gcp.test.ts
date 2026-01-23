import { describe, expect, it } from "vitest";

import { isValidGcpResource, parseGcpResource } from "../../../src/infra/gcp.js";

describe("isValidGcpResource", () => {
  it("should return true for valid GCP resource paths", () => {
    expect(isValidGcpResource("projects/my-project/locations/us-central1/services/my-service")).toBe(true);
    expect(isValidGcpResource("projects/my-project/secrets/my-secret")).toBe(true);
    expect(isValidGcpResource("projects/my-project/serviceAccounts/sa@my-project.iam.gserviceaccount.com")).toBe(true);
  });

  it("should return false for invalid GCP resource paths", () => {
    expect(isValidGcpResource("")).toBe(false);
    expect(isValidGcpResource("not-a-path")).toBe(false);
    expect(isValidGcpResource("projects/")).toBe(false);
    expect(isValidGcpResource("arn:aws:s3:::bucket")).toBe(false);
  });
});

describe("parseGcpResource", () => {
  describe("Cloud Run services", () => {
    it("should parse Cloud Run service path", () => {
      const result = parseGcpResource("projects/my-project/locations/us-central1/services/my-service");
      expect(result).toEqual({
        cloud: "gcp",
        project: "my-project",
        service: "run",
        location: "us-central1",
        resourceType: "services",
        resourceId: "my-service",
        raw: "projects/my-project/locations/us-central1/services/my-service",
      });
    });
  });

  describe("Secret Manager secrets", () => {
    it("should parse Secret Manager secret path", () => {
      const result = parseGcpResource("projects/my-project/secrets/my-secret");
      expect(result).toEqual({
        cloud: "gcp",
        project: "my-project",
        service: "secretmanager",
        location: "global",
        resourceType: "secrets",
        resourceId: "my-secret",
        raw: "projects/my-project/secrets/my-secret",
      });
    });
  });

  describe("Service Accounts", () => {
    it("should parse Service Account path", () => {
      const result = parseGcpResource("projects/my-project/serviceAccounts/sa@my-project.iam.gserviceaccount.com");
      expect(result).toEqual({
        cloud: "gcp",
        project: "my-project",
        service: "iam",
        location: "global",
        resourceType: "serviceAccounts",
        resourceId: "sa@my-project.iam.gserviceaccount.com",
        raw: "projects/my-project/serviceAccounts/sa@my-project.iam.gserviceaccount.com",
      });
    });
  });

  describe("Artifact Registry repositories", () => {
    it("should parse Artifact Registry repository path", () => {
      const result = parseGcpResource("projects/my-project/locations/us-central1/repositories/my-repo");
      expect(result).toEqual({
        cloud: "gcp",
        project: "my-project",
        service: "artifactregistry",
        location: "us-central1",
        resourceType: "repositories",
        resourceId: "my-repo",
        raw: "projects/my-project/locations/us-central1/repositories/my-repo",
      });
    });
  });

  describe("Invalid paths", () => {
    it("should return null for invalid paths", () => {
      expect(parseGcpResource("not-a-path")).toBeNull();
      expect(parseGcpResource("projects/")).toBeNull();
      expect(parseGcpResource("arn:aws:s3:::bucket")).toBeNull();
    });
  });
});

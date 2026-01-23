import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ManifestError, readManifest } from "../../../src/infra/manifest.js";

describe("readManifest", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "infra-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("JSON format", () => {
    it("should parse a valid JSON manifest", () => {
      const manifestPath = path.join(tempDir, "manifest.json");
      fs.writeFileSync(
        manifestPath,
        JSON.stringify({
          project: "my-project",
          resources: [
            "arn:aws:s3:::my-bucket",
            "arn:aws:lambda:us-east-1:123456789012:function:my-function",
          ],
        })
      );

      const result = readManifest(manifestPath);

      expect(result.project).toBe("my-project");
      expect(result.resources).toEqual([
        "arn:aws:s3:::my-bucket",
        "arn:aws:lambda:us-east-1:123456789012:function:my-function",
      ]);
    });

    it("should parse a JSON manifest without project", () => {
      const manifestPath = path.join(tempDir, "manifest.json");
      fs.writeFileSync(
        manifestPath,
        JSON.stringify({
          resources: ["arn:aws:s3:::my-bucket"],
        })
      );

      const result = readManifest(manifestPath);

      expect(result.project).toBeUndefined();
      expect(result.resources).toEqual(["arn:aws:s3:::my-bucket"]);
    });

    it("should throw for invalid JSON", () => {
      const manifestPath = path.join(tempDir, "manifest.json");
      fs.writeFileSync(manifestPath, "{ invalid json }");

      expect(() => readManifest(manifestPath)).toThrow(ManifestError);
      expect(() => readManifest(manifestPath)).toThrow(/Invalid JSON/);
    });

    it("should throw for non-object JSON", () => {
      const manifestPath = path.join(tempDir, "manifest.json");
      fs.writeFileSync(manifestPath, '"just a string"');

      expect(() => readManifest(manifestPath)).toThrow(ManifestError);
      expect(() => readManifest(manifestPath)).toThrow(/must be a JSON object/);
    });

    it("should throw for missing resources array", () => {
      const manifestPath = path.join(tempDir, "manifest.json");
      fs.writeFileSync(manifestPath, JSON.stringify({ project: "test" }));

      expect(() => readManifest(manifestPath)).toThrow(ManifestError);
      expect(() => readManifest(manifestPath)).toThrow(/must have a "resources" array/);
    });

    it("should throw for non-string resources", () => {
      const manifestPath = path.join(tempDir, "manifest.json");
      fs.writeFileSync(
        manifestPath,
        JSON.stringify({
          resources: [123, "arn:aws:s3:::my-bucket"],
        })
      );

      expect(() => readManifest(manifestPath)).toThrow(ManifestError);
      expect(() => readManifest(manifestPath)).toThrow(/non-string resource/);
    });

    it("should throw for invalid resources", () => {
      const manifestPath = path.join(tempDir, "manifest.json");
      fs.writeFileSync(
        manifestPath,
        JSON.stringify({
          resources: ["not-an-arn", "arn:aws:s3:::my-bucket"],
        })
      );

      expect(() => readManifest(manifestPath)).toThrow(ManifestError);
      expect(() => readManifest(manifestPath)).toThrow(/invalid resources.*not-an-arn/);
    });
  });

  describe("TXT format", () => {
    it("should parse a valid TXT manifest", () => {
      const manifestPath = path.join(tempDir, "manifest.txt");
      fs.writeFileSync(
        manifestPath,
        `# My infrastructure resources
arn:aws:s3:::my-bucket
arn:aws:lambda:us-east-1:123456789012:function:my-function

# More resources
arn:aws:dynamodb:us-east-1:123456789012:table/my-table
`
      );

      const result = readManifest(manifestPath);

      expect(result.project).toBeUndefined();
      expect(result.resources).toEqual([
        "arn:aws:s3:::my-bucket",
        "arn:aws:lambda:us-east-1:123456789012:function:my-function",
        "arn:aws:dynamodb:us-east-1:123456789012:table/my-table",
      ]);
    });

    it("should handle empty lines and comments", () => {
      const manifestPath = path.join(tempDir, "manifest.txt");
      fs.writeFileSync(
        manifestPath,
        `
# Comment

arn:aws:s3:::my-bucket
  # Indented comment

`
      );

      const result = readManifest(manifestPath);
      expect(result.resources).toEqual(["arn:aws:s3:::my-bucket"]);
    });

    it("should throw for invalid resources with line numbers", () => {
      const manifestPath = path.join(tempDir, "manifest.txt");
      fs.writeFileSync(
        manifestPath,
        `arn:aws:s3:::my-bucket
invalid-arn
arn:aws:lambda:us-east-1:123456789012:function:my-function
`
      );

      expect(() => readManifest(manifestPath)).toThrow(ManifestError);
      expect(() => readManifest(manifestPath)).toThrow(/line 2.*invalid-arn/);
    });
  });

  describe("Auto-detect format", () => {
    it("should auto-detect JSON format without extension", () => {
      const manifestPath = path.join(tempDir, "manifest");
      fs.writeFileSync(
        manifestPath,
        JSON.stringify({
          resources: ["arn:aws:s3:::my-bucket"],
        })
      );

      const result = readManifest(manifestPath);
      expect(result.resources).toEqual(["arn:aws:s3:::my-bucket"]);
    });

    it("should auto-detect TXT format without extension", () => {
      const manifestPath = path.join(tempDir, "manifest");
      fs.writeFileSync(manifestPath, "arn:aws:s3:::my-bucket\n");

      const result = readManifest(manifestPath);
      expect(result.resources).toEqual(["arn:aws:s3:::my-bucket"]);
    });
  });

  describe("File not found", () => {
    it("should throw for non-existent file", () => {
      expect(() => readManifest("/non/existent/path.json")).toThrow(ManifestError);
      expect(() => readManifest("/non/existent/path.json")).toThrow(/not found/);
    });
  });
});

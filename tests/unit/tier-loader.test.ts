import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadProjectTier } from "../../src/projects/tier-loader.js";

describe("loadProjectTier", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-tier-loader-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns undefined tier and null source when no repo-metadata.yaml", () => {
    const result = loadProjectTier(tempDir);
    expect(result.tier).toBeUndefined();
    expect(result.source).toBeNull();
  });

  it("returns tier from repo-metadata.yaml with production", () => {
    fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: production");
    const result = loadProjectTier(tempDir);
    expect(result.tier).toBe("production");
    expect(result.source).toBe("repo-metadata.yaml");
  });

  it("returns tier from repo-metadata.yaml with internal", () => {
    fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: internal");
    const result = loadProjectTier(tempDir);
    expect(result.tier).toBe("internal");
    expect(result.source).toBe("repo-metadata.yaml");
  });

  it("returns tier from repo-metadata.yaml with prototype", () => {
    fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: prototype");
    const result = loadProjectTier(tempDir);
    expect(result.tier).toBe("prototype");
    expect(result.source).toBe("repo-metadata.yaml");
  });

  it("returns internal default when tier field is missing", () => {
    fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "name: my-project");
    const result = loadProjectTier(tempDir);
    expect(result.tier).toBe("internal");
    expect(result.source).toBe("default");
  });

  it("returns internal default when tier is invalid", () => {
    fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "tier: invalid-tier");
    const result = loadProjectTier(tempDir);
    expect(result.tier).toBe("internal");
    expect(result.source).toBe("default");
  });

  it("handles malformed YAML by returning undefined tier and null source", () => {
    fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "not: valid: yaml:");
    const result = loadProjectTier(tempDir);
    expect(result.tier).toBeUndefined();
    expect(result.source).toBeNull();
  });

  it("handles empty file by returning internal default", () => {
    fs.writeFileSync(path.join(tempDir, "repo-metadata.yaml"), "");
    const result = loadProjectTier(tempDir);
    expect(result.tier).toBe("internal");
    expect(result.source).toBe("default");
  });

  it("handles YAML with additional fields", () => {
    fs.writeFileSync(
      path.join(tempDir, "repo-metadata.yaml"),
      "tier: production\nname: my-project\nowner: team-a"
    );
    const result = loadProjectTier(tempDir);
    expect(result.tier).toBe("production");
    expect(result.source).toBe("repo-metadata.yaml");
  });
});

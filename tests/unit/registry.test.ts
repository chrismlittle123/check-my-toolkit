import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchRegistry,
  loadRuleset,
  mergeConfigs,
  parseRegistryUrl,
  resolveExtends,
} from "../../src/config/registry.js";
import { ConfigError } from "../../src/config/loader.js";
import type { Config } from "../../src/config/schema.js";

// Mock execa for git operations
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";
const mockedExeca = vi.mocked(execa);

describe("Registry", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-registry-test-"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("parseRegistryUrl", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Clear relevant env vars for each test
      delete process.env.CM_REGISTRY_TOKEN;
      delete process.env.GITHUB_TOKEN;
      delete process.env.SSH_AUTH_SOCK;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("parses GitHub URL without ref", () => {
      const result = parseRegistryUrl("github:myorg/standards");
      expect(result.type).toBe("github");
      expect(result.owner).toBe("myorg");
      expect(result.repo).toBe("standards");
      expect(result.ref).toBeUndefined();
      expect(result.path).toBe("https://github.com/myorg/standards.git");
    });

    it("parses GitHub URL with ref", () => {
      const result = parseRegistryUrl("github:myorg/standards@v1.0.0");
      expect(result.type).toBe("github");
      expect(result.owner).toBe("myorg");
      expect(result.repo).toBe("standards");
      expect(result.ref).toBe("v1.0.0");
    });

    it("parses absolute local path", () => {
      const result = parseRegistryUrl("/path/to/registry");
      expect(result.type).toBe("local");
      expect(result.path).toBe("/path/to/registry");
    });

    it("resolves relative local path against configDir", () => {
      const result = parseRegistryUrl("./my-registry", "/home/user/project");
      expect(result.type).toBe("local");
      expect(result.path).toBe("/home/user/project/my-registry");
    });

    it("throws for invalid GitHub URL", () => {
      expect(() => parseRegistryUrl("github:invalid")).toThrow(ConfigError);
      expect(() => parseRegistryUrl("github:invalid")).toThrow("Invalid GitHub registry URL");
    });

    describe("private registry support", () => {
      it("parses github+ssh: URL with SSH path", () => {
        const result = parseRegistryUrl("github+ssh:myorg/private-standards");
        expect(result.type).toBe("github");
        expect(result.owner).toBe("myorg");
        expect(result.repo).toBe("private-standards");
        expect(result.path).toBe("git@github.com:myorg/private-standards.git");
        expect(result.auth).toBe("ssh");
      });

      it("parses github+ssh: URL with ref", () => {
        const result = parseRegistryUrl("github+ssh:myorg/private-standards@v2.0.0");
        expect(result.type).toBe("github");
        expect(result.owner).toBe("myorg");
        expect(result.repo).toBe("private-standards");
        expect(result.ref).toBe("v2.0.0");
        expect(result.path).toBe("git@github.com:myorg/private-standards.git");
        expect(result.auth).toBe("ssh");
      });

      it("parses github+token: URL with token in path", () => {
        process.env.GITHUB_TOKEN = "ghp_test123";
        const result = parseRegistryUrl("github+token:myorg/private-standards");
        expect(result.type).toBe("github");
        expect(result.owner).toBe("myorg");
        expect(result.repo).toBe("private-standards");
        expect(result.path).toBe(
          "https://x-access-token:ghp_test123@github.com/myorg/private-standards.git"
        );
        expect(result.auth).toBe("token");
      });

      it("prefers CM_REGISTRY_TOKEN over GITHUB_TOKEN", () => {
        process.env.GITHUB_TOKEN = "ghp_github";
        process.env.CM_REGISTRY_TOKEN = "ghp_cm_registry";
        const result = parseRegistryUrl("github+token:myorg/private-standards");
        expect(result.path).toBe(
          "https://x-access-token:ghp_cm_registry@github.com/myorg/private-standards.git"
        );
      });

      it("falls back to HTTPS when token auth requested but no token found", () => {
        const result = parseRegistryUrl("github+token:myorg/private-standards");
        expect(result.path).toBe("https://github.com/myorg/private-standards.git");
        expect(result.auth).toBe("token");
      });

      it("auto-detects token auth when GITHUB_TOKEN is set", () => {
        process.env.GITHUB_TOKEN = "ghp_auto123";
        const result = parseRegistryUrl("github:myorg/standards");
        expect(result.path).toBe(
          "https://x-access-token:ghp_auto123@github.com/myorg/standards.git"
        );
        expect(result.auth).toBe("token");
      });

      it("auto-detects SSH auth when SSH_AUTH_SOCK is set", () => {
        process.env.SSH_AUTH_SOCK = "/tmp/ssh-agent.sock";
        const result = parseRegistryUrl("github:myorg/standards");
        expect(result.path).toBe("git@github.com:myorg/standards.git");
        expect(result.auth).toBe("ssh");
      });

      it("prefers token over SSH when both are available", () => {
        process.env.GITHUB_TOKEN = "ghp_test";
        process.env.SSH_AUTH_SOCK = "/tmp/ssh-agent.sock";
        const result = parseRegistryUrl("github:myorg/standards");
        expect(result.auth).toBe("token");
      });

      it("uses no auth when neither token nor SSH is available", () => {
        const result = parseRegistryUrl("github:myorg/standards");
        expect(result.path).toBe("https://github.com/myorg/standards.git");
        expect(result.auth).toBe("none");
      });

      it("throws for invalid github+ prefix", () => {
        expect(() => parseRegistryUrl("github+invalid:myorg/repo")).toThrow(ConfigError);
      });
    });
  });

  describe("loadRuleset", () => {
    it("loads a valid ruleset", () => {
      const rulesetsDir = path.join(tempDir, "rulesets");
      fs.mkdirSync(rulesetsDir);
      fs.writeFileSync(
        path.join(rulesetsDir, "typescript.toml"),
        `[code.linting.eslint]
enabled = true

[code.types.tsc]
enabled = true`
      );

      const config = loadRuleset(tempDir, "typescript");

      expect(config.code?.linting?.eslint?.enabled).toBe(true);
      expect(config.code?.types?.tsc?.enabled).toBe(true);
    });

    it("throws for missing ruleset", () => {
      fs.mkdirSync(path.join(tempDir, "rulesets"));

      expect(() => loadRuleset(tempDir, "nonexistent")).toThrow(ConfigError);
      expect(() => loadRuleset(tempDir, "nonexistent")).toThrow("Ruleset not found: nonexistent");
    });

    it("throws for invalid TOML", () => {
      const rulesetsDir = path.join(tempDir, "rulesets");
      fs.mkdirSync(rulesetsDir);
      fs.writeFileSync(path.join(rulesetsDir, "broken.toml"), "invalid [ toml");

      expect(() => loadRuleset(tempDir, "broken")).toThrow(ConfigError);
      expect(() => loadRuleset(tempDir, "broken")).toThrow("Failed to parse ruleset broken");
    });

    it("throws for invalid schema", () => {
      const rulesetsDir = path.join(tempDir, "rulesets");
      fs.mkdirSync(rulesetsDir);
      fs.writeFileSync(
        path.join(rulesetsDir, "invalid.toml"),
        `[unknown_section]
foo = "bar"`
      );

      expect(() => loadRuleset(tempDir, "invalid")).toThrow(ConfigError);
      expect(() => loadRuleset(tempDir, "invalid")).toThrow("Invalid ruleset invalid");
    });
  });

  describe("mergeConfigs", () => {
    it("merges empty configs", () => {
      const result = mergeConfigs({}, {});
      expect(result).toEqual({});
    });

    it("preserves base config when override is empty", () => {
      const base: Config = {
        code: {
          linting: {
            eslint: { enabled: true },
          },
        },
      };

      const result = mergeConfigs(base, {});
      expect(result.code?.linting?.eslint?.enabled).toBe(true);
    });

    it("overrides values from base with override", () => {
      const base: Config = {
        code: {
          linting: {
            eslint: { enabled: true },
          },
        },
      };

      const override: Config = {
        code: {
          linting: {
            eslint: { enabled: false },
          },
        },
      };

      const result = mergeConfigs(base, override);
      expect(result.code?.linting?.eslint?.enabled).toBe(false);
    });

    it("merges different sections", () => {
      const base: Config = {
        code: {
          linting: {
            eslint: { enabled: true },
          },
        },
      };

      const override: Config = {
        code: {
          types: {
            tsc: { enabled: true },
          },
        },
      };

      const result = mergeConfigs(base, override);
      expect(result.code?.linting?.eslint?.enabled).toBe(true);
      expect(result.code?.types?.tsc?.enabled).toBe(true);
    });

    it("merges all code sections", () => {
      const base: Config = {
        code: {
          linting: { eslint: { enabled: true } },
          formatting: { prettier: { enabled: true } },
          types: { tsc: { enabled: true } },
          unused: { knip: { enabled: true } },
          security: { secrets: { enabled: true } },
        },
      };

      const override: Config = {
        code: {
          linting: { ruff: { enabled: true } },
          types: { ty: { enabled: true } },
          unused: { vulture: { enabled: true } },
          security: { pnpmaudit: { enabled: true }, pipaudit: { enabled: true } },
        },
      };

      const result = mergeConfigs(base, override);

      // Base values preserved
      expect(result.code?.linting?.eslint?.enabled).toBe(true);
      expect(result.code?.formatting?.prettier?.enabled).toBe(true);
      expect(result.code?.types?.tsc?.enabled).toBe(true);
      expect(result.code?.unused?.knip?.enabled).toBe(true);
      expect(result.code?.security?.secrets?.enabled).toBe(true);

      // Override values added
      expect(result.code?.linting?.ruff?.enabled).toBe(true);
      expect(result.code?.types?.ty?.enabled).toBe(true);
      expect(result.code?.unused?.vulture?.enabled).toBe(true);
      expect(result.code?.security?.pnpmaudit?.enabled).toBe(true);
      expect(result.code?.security?.pipaudit?.enabled).toBe(true);
    });
  });

  describe("fetchRegistry", () => {
    it("returns path for existing local registry", async () => {
      const result = await fetchRegistry({ type: "local", path: tempDir });
      expect(result).toBe(tempDir);
    });

    it("throws for missing local registry", async () => {
      await expect(fetchRegistry({ type: "local", path: "/nonexistent/path" })).rejects.toThrow(
        ConfigError
      );
    });

    it("clones GitHub registry", async () => {
      mockedExeca.mockResolvedValueOnce({} as never);

      const location = {
        type: "github" as const,
        owner: "myorg",
        repo: "standards",
        path: "https://github.com/myorg/standards.git",
      };

      await fetchRegistry(location);

      expect(mockedExeca).toHaveBeenCalledWith(
        "git",
        expect.arrayContaining(["clone", "--depth", "1"]),
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it("clones with specific ref", async () => {
      mockedExeca.mockResolvedValueOnce({} as never);

      const location = {
        type: "github" as const,
        owner: "myorg",
        repo: "standards",
        ref: "v1.0.0",
        path: "https://github.com/myorg/standards.git",
      };

      await fetchRegistry(location);

      expect(mockedExeca).toHaveBeenCalledWith(
        "git",
        expect.arrayContaining(["--branch", "v1.0.0"]),
        expect.objectContaining({ timeout: 30000 })
      );
    });
  });

  describe("resolveExtends", () => {
    it("returns config unchanged when no extends", async () => {
      const config: Config = {
        code: {
          linting: { eslint: { enabled: true } },
        },
      };

      const result = await resolveExtends(config, tempDir);

      expect(result).toEqual(config);
    });

    it("merges rulesets from local registry", async () => {
      // Create local registry structure
      const rulesetsDir = path.join(tempDir, "rulesets");
      fs.mkdirSync(rulesetsDir);

      fs.writeFileSync(
        path.join(rulesetsDir, "base.toml"),
        `[code.linting.eslint]
enabled = true`
      );

      fs.writeFileSync(
        path.join(rulesetsDir, "typescript.toml"),
        `[code.types.tsc]
enabled = true`
      );

      const config: Config = {
        extends: {
          registry: tempDir,
          rulesets: ["base", "typescript"],
        },
        code: {
          unused: { knip: { enabled: true } },
        },
      };

      const result = await resolveExtends(config, "/some/project");

      expect(result.code?.linting?.eslint?.enabled).toBe(true);
      expect(result.code?.types?.tsc?.enabled).toBe(true);
      expect(result.code?.unused?.knip?.enabled).toBe(true);
      expect(result.extends).toBeUndefined();
    });

    it("applies rulesets in order", async () => {
      const rulesetsDir = path.join(tempDir, "rulesets");
      fs.mkdirSync(rulesetsDir);

      fs.writeFileSync(
        path.join(rulesetsDir, "first.toml"),
        `[code.linting.eslint]
enabled = false`
      );

      fs.writeFileSync(
        path.join(rulesetsDir, "second.toml"),
        `[code.linting.eslint]
enabled = true`
      );

      const config: Config = {
        extends: {
          registry: tempDir,
          rulesets: ["first", "second"],
        },
      };

      const result = await resolveExtends(config, "/some/project");

      // Second ruleset should override first
      expect(result.code?.linting?.eslint?.enabled).toBe(true);
    });

    it("local config overrides rulesets", async () => {
      const rulesetsDir = path.join(tempDir, "rulesets");
      fs.mkdirSync(rulesetsDir);

      fs.writeFileSync(
        path.join(rulesetsDir, "base.toml"),
        `[code.linting.eslint]
enabled = true`
      );

      const config: Config = {
        extends: {
          registry: tempDir,
          rulesets: ["base"],
        },
        code: {
          linting: { eslint: { enabled: false } },
        },
      };

      const result = await resolveExtends(config, "/some/project");

      // Local config should override ruleset
      expect(result.code?.linting?.eslint?.enabled).toBe(false);
    });
  });
});

import { describe, expect, it } from "vitest";

import { configSchema, defaultConfig, type Config } from "../../src/config/schema.js";

describe("configSchema", () => {
  describe("valid configurations", () => {
    it("accepts empty config", () => {
      const result = configSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts minimal code config", () => {
      const result = configSchema.safeParse({
        code: {},
      });
      expect(result.success).toBe(true);
    });

    it("accepts ESLint config with enabled flag only", () => {
      // Note: ESLint rules are not configurable via check.toml
      // because ESLint flat config doesn't support CLI rule overrides.
      // Configure rules in your eslint.config.js file.
      const config = {
        code: {
          linting: {
            eslint: {
              enabled: true,
            },
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("accepts ESLint config with rules", () => {
      const config = {
        code: {
          linting: {
            eslint: {
              enabled: true,
              rules: {
                "no-unused-vars": "error",
                semi: "warn",
                // TOML-friendly object format for rules with options
                "no-console": { severity: "error", allow: ["warn", "error"] },
              },
            },
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("accepts full code config with Ruff", () => {
      const config = {
        code: {
          linting: {
            ruff: {
              enabled: true,
              "line-length": 100,
              lint: {
                select: ["E", "F", "W"],
                ignore: ["E501"],
              },
            },
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("accepts TypeScript config", () => {
      // Note: TypeScript compiler options are not configurable via check.toml
      // because tsc CLI flags can only ADD strictness, not override tsconfig.json.
      // Configure compiler options in your tsconfig.json file.
      const config = {
        code: {
          types: {
            tsc: {
              enabled: true,
            },
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("rejects TypeScript compiler options (not supported)", () => {
      // TypeScript compiler options are not supported in check.toml
      const config = {
        code: {
          types: {
            tsc: {
              enabled: true,
              strict: true,
            },
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("accepts process config with hooks", () => {
      const config = {
        process: {
          hooks: {
            enabled: true,
            require_husky: true,
            require_hooks: ["pre-commit", "pre-push"],
            commands: {
              "pre-commit": ["lint-staged"],
            },
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("accepts valid process.pr config", () => {
      const config = {
        process: {
          pr: { enabled: true, max_files: 10, max_lines: 400 },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("accepts valid process.tickets config", () => {
      const config = {
        process: {
          tickets: {
            enabled: true,
            pattern: "^(ABC|XYZ)-[0-9]+",
            require_in_commits: true,
            require_in_branch: false,
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("accepts process.backups config", () => {
      const config = {
        process: {
          backups: {
            enabled: true,
            bucket: "test-bucket",
            prefix: "backups/",
            max_age_hours: 48,
            region: "us-west-2",
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("rejects stack config (not implemented)", () => {
      // stack domain is reserved for future use
      const config = {
        stack: {
          tools: { node: ">=18" },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("accepts complete code config", () => {
      const config = {
        code: {
          linting: {
            eslint: { enabled: true },
            ruff: { enabled: false },
          },
          types: {
            tsc: { enabled: true },
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid configurations", () => {
    it("rejects negative line-length", () => {
      const config = {
        code: {
          linting: {
            ruff: {
              "line-length": -1,
            },
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("rejects non-integer line-length", () => {
      const config = {
        code: {
          linting: {
            ruff: {
              "line-length": 100.5,
            },
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("default values", () => {
    it("defaults eslint.enabled to true when eslint section exists", () => {
      const config = {
        code: {
          linting: {
            eslint: {},
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code?.linting?.eslint?.enabled).toBe(true);
      }
    });

    it("defaults ruff.enabled to true when ruff section exists", () => {
      const config = {
        code: {
          linting: {
            ruff: {},
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code?.linting?.ruff?.enabled).toBe(true);
      }
    });

    it("defaults tsc.enabled to false when tsc section exists", () => {
      const config = {
        code: {
          types: {
            tsc: {},
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code?.types?.tsc?.enabled).toBe(false);
      }
    });
  });
});

describe("defaultConfig", () => {
  it("has code section with disabled tools", () => {
    expect(defaultConfig.code).toBeDefined();
    expect(defaultConfig.code?.linting?.eslint?.enabled).toBe(false);
    expect(defaultConfig.code?.linting?.ruff?.enabled).toBe(false);
    expect(defaultConfig.code?.types?.tsc?.enabled).toBe(false);
  });

  it("has security tools disabled by default", () => {
    expect(defaultConfig.code?.security?.npmaudit?.enabled).toBe(false);
    expect(defaultConfig.code?.security?.pipaudit?.enabled).toBe(false);
  });

  it("has process hooks disabled by default", () => {
    expect(defaultConfig.process).toBeDefined();
    expect(defaultConfig.process?.hooks?.enabled).toBe(false);
    expect(defaultConfig.process?.hooks?.require_husky).toBe(true);
  });

  it("does not have stack section (not implemented)", () => {
    // stack domain is reserved for future use
    expect((defaultConfig as Record<string, unknown>).stack).toBeUndefined();
  });

  it("matches Config type", () => {
    const config: Config = defaultConfig;
    expect(config).toBeDefined();
  });
});

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

    it("accepts full code config with ESLint", () => {
      const config = {
        code: {
          linting: {
            eslint: {
              enabled: true,
              rules: {
                "no-unused-vars": "error",
                "semi": ["error", "always"],
              },
            },
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("accepts ESLint rules with off/warn/error values", () => {
      const config = {
        code: {
          linting: {
            eslint: {
              enabled: true,
              rules: {
                "rule-off": "off",
                "rule-warn": "warn",
                "rule-error": "error",
              },
            },
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("accepts ESLint rules with tuple values", () => {
      const config = {
        code: {
          linting: {
            eslint: {
              enabled: true,
              rules: {
                "quotes": ["error", "double"],
                "indent": ["warn", 2, { SwitchCase: 1 }],
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
      const config = {
        code: {
          types: {
            tsc: {
              enabled: true,
              strict: true,
              noImplicitAny: true,
              strictNullChecks: true,
              strictFunctionTypes: true,
              strictBindCallApply: true,
              strictPropertyInitialization: true,
              noImplicitThis: true,
              alwaysStrict: true,
              noUncheckedIndexedAccess: true,
              noImplicitReturns: true,
              noFallthroughCasesInSwitch: true,
              noUnusedLocals: true,
              noUnusedParameters: true,
              exactOptionalPropertyTypes: true,
              noImplicitOverride: true,
              allowUnusedLabels: false,
              allowUnreachableCode: false,
            },
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("accepts code complexity limits", () => {
      const config = {
        code: {
          complexity: {
            max_file_lines: 500,
            max_function_lines: 50,
            max_parameters: 5,
            max_nesting_depth: 4,
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("accepts code files config", () => {
      const config = {
        code: {
          files: {
            repo: ["src/**/*.ts"],
            tooling: ["eslint.config.js", "tsconfig.json"],
            docs: ["README.md", "docs/**/*.md"],
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("accepts process config", () => {
      const config = {
        process: {
          pr: {
            max_files: 10,
            max_lines: 500,
            min_approvals: 2,
          },
          branches: {
            pattern: "^(main|develop|feature/.+|bugfix/.+)$",
          },
          tickets: {
            pattern: "^[A-Z]+-\\d+$",
            check_in: ["commit", "pr"],
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("accepts stack config", () => {
      const config = {
        stack: {
          tools: {
            node: ">=18.0.0",
            npm: ">=9.0.0",
            python: ">=3.10",
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("accepts complete config with all sections", () => {
      const config = {
        code: {
          linting: {
            eslint: { enabled: true },
            ruff: { enabled: false },
          },
          types: {
            tsc: { enabled: true },
          },
          complexity: {
            max_file_lines: 500,
          },
          files: {
            repo: ["src/**/*.ts"],
          },
        },
        process: {
          pr: { max_files: 10 },
          branches: { pattern: "^main$" },
          tickets: { pattern: "^JIRA-\\d+$" },
        },
        stack: {
          tools: { node: ">=18" },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid configurations", () => {
    it("rejects invalid ESLint rule value", () => {
      const config = {
        code: {
          linting: {
            eslint: {
              rules: {
                "no-unused-vars": "invalid",
              },
            },
          },
        },
      };
      const result = configSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

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

    it("rejects negative complexity limits", () => {
      const config = {
        code: {
          complexity: {
            max_file_lines: -100,
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

  it("has empty complexity section", () => {
    expect(defaultConfig.code?.complexity).toEqual({});
  });

  it("has security tools disabled by default", () => {
    expect(defaultConfig.code?.security?.npmaudit?.enabled).toBe(false);
    expect(defaultConfig.code?.security?.pipaudit?.enabled).toBe(false);
  });

  it("has empty process sections", () => {
    expect(defaultConfig.process?.pr).toEqual({});
    expect(defaultConfig.process?.branches).toEqual({});
    expect(defaultConfig.process?.tickets).toEqual({});
  });

  it("has empty stack tools", () => {
    expect(defaultConfig.stack?.tools).toEqual({});
  });

  it("matches Config type", () => {
    const config: Config = defaultConfig;
    expect(config).toBeDefined();
  });
});

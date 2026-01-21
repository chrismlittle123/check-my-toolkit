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
    expect(defaultConfig.code?.security?.pnpmaudit?.enabled).toBe(false);
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

describe("#162 - forbidden_files glob pattern validation", () => {
  it("accepts valid glob patterns", () => {
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          files: ["*.log", "**/*.tmp", "dist/**", ".env*", "!.env.example"],
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("accepts patterns with special characters", () => {
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          files: ["file[1-9].txt", "test?.js", "config.{json,yaml}"],
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("rejects patterns with unclosed brackets (fix #186)", () => {
    // #186: unclosed brackets should be rejected as invalid glob patterns
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          files: ["file[1.txt"], // Unclosed bracket - invalid
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("unclosed bracket");
    }
  });

  it("requires files to be strings", () => {
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          // TypeScript would prevent this, but we test schema validation
          files: [123, true],
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("rejects empty string patterns", () => {
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          files: ["valid.txt", ""], // Empty string is invalid
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("Invalid glob pattern");
    }
  });
});

describe("#186 - forbidden_files glob pattern validation", () => {
  it("accepts valid ignore patterns", () => {
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          files: ["**/.env"],
          ignore: ["**/node_modules/**", "**/.git/**", "test-fixtures/**"],
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("accepts empty ignore array (override defaults)", () => {
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          files: ["**/.env"],
          ignore: [], // Explicitly empty to override defaults
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("rejects empty string in ignore patterns", () => {
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          files: ["**/.env"],
          ignore: ["**/valid/**", ""], // Empty string is invalid
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("Invalid glob pattern");
    }
  });

  it("validates ignore patterns with special glob syntax", () => {
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          files: ["**/.env"],
          ignore: ["**/test[0-9]/**", "**/*.{js,ts}"],
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("rejects unclosed bracket in files pattern", () => {
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          files: ["[invalid"], // Unclosed bracket
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("unclosed bracket");
    }
  });

  it("rejects unclosed brace in files pattern", () => {
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          files: ["*.{js,ts"], // Unclosed brace
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("unclosed brace");
    }
  });

  it("rejects unclosed bracket in ignore pattern", () => {
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          files: ["**/.env"],
          ignore: ["test[invalid"], // Unclosed bracket
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("unclosed bracket");
    }
  });

  it("accepts escaped brackets", () => {
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          files: ["file\\[1\\].txt"], // Escaped brackets are valid
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("accepts properly closed brackets and braces", () => {
    const config = {
      process: {
        forbidden_files: {
          enabled: true,
          files: ["**/file[0-9].txt", "**/*.{js,ts,tsx}"],
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});

describe("#140 - cross-rule duplicate extension validation", () => {
  it("accepts rules with different extensions", () => {
    const config = {
      code: {
        naming: {
          enabled: true,
          rules: [
            { extensions: ["ts", "tsx"], file_case: "kebab-case", folder_case: "kebab-case" },
            { extensions: ["py"], file_case: "snake_case", folder_case: "snake_case" },
          ],
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("accepts single rule (no cross-rule validation needed)", () => {
    const config = {
      code: {
        naming: {
          enabled: true,
          rules: [
            { extensions: ["ts", "tsx"], file_case: "kebab-case", folder_case: "kebab-case" },
          ],
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("accepts empty rules array", () => {
    const config = {
      code: {
        naming: {
          enabled: true,
          rules: [],
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("rejects duplicate extensions across rules", () => {
    const config = {
      code: {
        naming: {
          enabled: true,
          rules: [
            { extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" },
            { extensions: ["ts"], file_case: "PascalCase", folder_case: "PascalCase" },
          ],
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("ts");
      expect(result.error.errors[0].message).toContain("multiple naming rules");
    }
  });

  it("rejects overlapping extensions in multi-extension rules", () => {
    const config = {
      code: {
        naming: {
          enabled: true,
          rules: [
            { extensions: ["ts", "tsx"], file_case: "kebab-case", folder_case: "kebab-case" },
            { extensions: ["js", "ts"], file_case: "camelCase", folder_case: "camelCase" },
          ],
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("ts");
    }
  });

  it("reports correct rule numbers in error message", () => {
    const config = {
      code: {
        naming: {
          enabled: true,
          rules: [
            { extensions: ["ts"], file_case: "kebab-case", folder_case: "kebab-case" },
            { extensions: ["js"], file_case: "kebab-case", folder_case: "kebab-case" },
            { extensions: ["ts"], file_case: "PascalCase", folder_case: "PascalCase" },
          ],
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      // ts appears in rule 1 and rule 3
      expect(result.error.errors[0].message).toContain("rules 1 and 3");
    }
  });

  it("still validates duplicates within a single rule", () => {
    const config = {
      code: {
        naming: {
          enabled: true,
          rules: [{ extensions: ["ts", "ts"], file_case: "kebab-case", folder_case: "kebab-case" }],
        },
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("Duplicate values not allowed");
    }
  });
});

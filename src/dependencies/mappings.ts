/**
 * Built-in dependency mappings for tools
 *
 * Maps tool IDs to their known configuration file patterns.
 * These patterns may include globs that need to be expanded.
 */

import type { ToolDependencyMapping } from "./types.js";

/**
 * Built-in dependency mappings for all supported tools.
 * Keys match the toolId used in check.toml config paths.
 */
export const BUILTIN_MAPPINGS: Record<string, ToolDependencyMapping> = {
  // Linting tools
  eslint: {
    toolId: "eslint",
    configFiles: [
      "eslint.config.js",
      "eslint.config.mjs",
      "eslint.config.cjs",
      ".eslintrc.js",
      ".eslintrc.json",
      ".eslintrc.yml",
      ".eslintrc.yaml",
      ".eslintignore",
    ],
  },
  ruff: {
    toolId: "ruff",
    configFiles: ["ruff.toml", ".ruff.toml", "pyproject.toml"],
  },

  // Formatting tools
  prettier: {
    toolId: "prettier",
    configFiles: [
      ".prettierrc",
      ".prettierrc.json",
      ".prettierrc.yaml",
      ".prettierrc.yml",
      ".prettierrc.js",
      ".prettierrc.cjs",
      ".prettierrc.mjs",
      "prettier.config.js",
      "prettier.config.cjs",
      "prettier.config.mjs",
      ".prettierignore",
    ],
  },

  // Type checking tools
  tsc: {
    toolId: "tsc",
    configFiles: ["tsconfig.json", "tsconfig.*.json"],
  },
  ty: {
    toolId: "ty",
    configFiles: ["ty.toml", "pyproject.toml"],
  },

  // Unused code detection
  knip: {
    toolId: "knip",
    configFiles: [
      "knip.json",
      "knip.jsonc",
      "knip.js",
      "knip.ts",
      "knip.config.js",
      "knip.config.ts",
    ],
  },
  vulture: {
    toolId: "vulture",
    configFiles: ["pyproject.toml"],
  },

  // Test coverage / test runners
  vitest: {
    toolId: "vitest",
    configFiles: [
      "vitest.config.ts",
      "vitest.config.js",
      "vitest.config.mts",
      "vitest.config.mjs",
      "vite.config.ts",
      "vite.config.js",
    ],
  },
  jest: {
    toolId: "jest",
    configFiles: [
      "jest.config.js",
      "jest.config.ts",
      "jest.config.mjs",
      "jest.config.cjs",
      "jest.config.json",
    ],
  },
  pytest: {
    toolId: "pytest",
    configFiles: ["pytest.ini", "pyproject.toml", "setup.cfg", "conftest.py"],
  },

  // Security tools
  secrets: {
    toolId: "secrets",
    configFiles: [".gitleaks.toml", "gitleaks.toml"],
  },
  pnpmaudit: {
    toolId: "pnpmaudit",
    configFiles: ["pnpm-lock.yaml"],
  },
  pipaudit: {
    toolId: "pipaudit",
    configFiles: ["requirements.txt", "pyproject.toml", "setup.py"],
  },
};

/**
 * Files that are always tracked regardless of which tools are enabled.
 * These patterns may include globs.
 */
export const ALWAYS_TRACKED: string[] = [
  "check.toml",
  ".github/workflows/*.yml",
  ".github/workflows/*.yaml",
  "repo-metadata.yaml",
];

/**
 * Mapping from check.toml config path to tool ID for dependency lookup.
 * This handles the nested structure of check.toml where tools are organized
 * by category (linting, formatting, types, etc.)
 */
export const CONFIG_PATH_TO_TOOL: Record<string, string> = {
  "code.linting.eslint": "eslint",
  "code.linting.ruff": "ruff",
  "code.formatting.prettier": "prettier",
  "code.types.tsc": "tsc",
  "code.types.ty": "ty",
  "code.unused.knip": "knip",
  "code.unused.vulture": "vulture",
  "code.security.secrets": "secrets",
  "code.security.pnpmaudit": "pnpmaudit",
  "code.security.pipaudit": "pipaudit",
};

import { z } from "zod";

/**
 * Zod schema for check.toml configuration
 */

// =============================================================================
// ESLint Configuration
// =============================================================================

/** ESLint configuration */
// Note: ESLint rules are not configurable via check.toml because ESLint flat config
// doesn't support CLI rule overrides. Configure rules in your eslint.config.js file.
const eslintConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
  })
  .strict()
  .optional();

// =============================================================================
// Ruff Configuration
// =============================================================================

/** Ruff lint configuration */
const ruffLintSchema = z
  .object({
    select: z.array(z.string()).optional(),
    ignore: z.array(z.string()).optional(),
  })
  .strict()
  .optional();

/** Ruff configuration */
const ruffConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
    format: z.boolean().optional().default(false), // Also check formatting with ruff format
    "line-length": z.number().int().positive().optional(),
    lint: ruffLintSchema,
  })
  .strict()
  .optional();

// =============================================================================
// TypeScript Configuration
// =============================================================================

/** TypeScript compiler configuration */
const tscConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    // Strict type-checking options
    strict: z.boolean().optional(),
    noImplicitAny: z.boolean().optional(),
    strictNullChecks: z.boolean().optional(),
    strictFunctionTypes: z.boolean().optional(),
    strictBindCallApply: z.boolean().optional(),
    strictPropertyInitialization: z.boolean().optional(),
    noImplicitThis: z.boolean().optional(),
    alwaysStrict: z.boolean().optional(),
    // Additional strictness
    noUncheckedIndexedAccess: z.boolean().optional(),
    noImplicitReturns: z.boolean().optional(),
    noFallthroughCasesInSwitch: z.boolean().optional(),
    noUnusedLocals: z.boolean().optional(),
    noUnusedParameters: z.boolean().optional(),
    exactOptionalPropertyTypes: z.boolean().optional(),
    noImplicitOverride: z.boolean().optional(),
    // Permissive options
    allowUnusedLabels: z.boolean().optional(),
    allowUnreachableCode: z.boolean().optional(),
  })
  .strict()
  .optional();

// =============================================================================
// ty Configuration (Python Type Checking)
// =============================================================================

/** ty Python type checker configuration */
const tyConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
  })
  .strict()
  .optional();

// =============================================================================
// Knip Configuration (Unused Code Detection)
// =============================================================================

/** Knip configuration */
const knipConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
  })
  .strict()
  .optional();

// =============================================================================
// Vulture Configuration (Python Dead Code Detection)
// =============================================================================

/** Vulture configuration */
const vultureConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
  })
  .strict()
  .optional();

// =============================================================================
// Prettier Configuration
// =============================================================================

/** Prettier configuration */
const prettierConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
  })
  .strict()
  .optional();

// =============================================================================
// Tests Validation Configuration
// =============================================================================

/** Tests validation configuration */
const testsConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    pattern: z.string().optional(), // Glob pattern for test files
    min_test_files: z.number().int().positive().optional(), // Minimum test files required
  })
  .strict()
  .optional();

// =============================================================================
// Security Configuration
// =============================================================================

/** Secrets (Gitleaks) configuration */
const secretsConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
  })
  .strict()
  .optional();

/** npm audit configuration */
const npmauditConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
  })
  .strict()
  .optional();

/** pip-audit configuration */
const pipauditConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
  })
  .strict()
  .optional();

/** Code security configuration */
const codeSecuritySchema = z
  .object({
    secrets: secretsConfigSchema,
    npmaudit: npmauditConfigSchema,
    pipaudit: pipauditConfigSchema,
  })
  .strict()
  .optional();

// =============================================================================
// Code Complexity / Limits Configuration
// =============================================================================

/** Code limits configuration */
const codeLimitsSchema = z
  .object({
    max_file_lines: z.number().int().positive().optional(),
    max_function_lines: z.number().int().positive().optional(),
    max_parameters: z.number().int().positive().optional(),
    max_nesting_depth: z.number().int().positive().optional(),
  })
  .strict()
  .optional();

// =============================================================================
// Code Files Configuration
// =============================================================================

/** Code files configuration */
const codeFilesSchema = z
  .object({
    repo: z.array(z.string()).optional(),
    tooling: z.array(z.string()).optional(),
    docs: z.array(z.string()).optional(),
  })
  .strict()
  .optional();

// =============================================================================
// Code Domain Configuration
// =============================================================================

/** Code linting configuration */
const codeLintingSchema = z
  .object({
    eslint: eslintConfigSchema,
    ruff: ruffConfigSchema,
  })
  .strict()
  .optional();

/** Code formatting configuration */
const codeFormattingSchema = z
  .object({
    prettier: prettierConfigSchema,
  })
  .strict()
  .optional();

/** Code type checking configuration */
const codeTypesSchema = z
  .object({
    tsc: tscConfigSchema,
    ty: tyConfigSchema,
  })
  .strict()
  .optional();

/** Code unused detection configuration */
const codeUnusedSchema = z
  .object({
    knip: knipConfigSchema,
    vulture: vultureConfigSchema,
  })
  .strict()
  .optional();

/** Code domain configuration */
const codeSchema = z
  .object({
    linting: codeLintingSchema,
    formatting: codeFormattingSchema,
    types: codeTypesSchema,
    unused: codeUnusedSchema,
    tests: testsConfigSchema,
    security: codeSecuritySchema,
    complexity: codeLimitsSchema,
    files: codeFilesSchema,
  })
  .strict()
  .optional();

// =============================================================================
// Process Domain Configuration
// =============================================================================

/** Process PR configuration */
const processPrSchema = z
  .object({
    max_files: z.number().optional(),
    max_lines: z.number().optional(),
    min_approvals: z.number().optional(),
  })
  .strict()
  .optional();

/** Process branches configuration */
const processBranchesSchema = z
  .object({
    pattern: z.string().optional(),
  })
  .strict()
  .optional();

/** Process tickets configuration */
const processTicketsSchema = z
  .object({
    pattern: z.string().optional(),
    check_in: z.array(z.string()).optional(),
  })
  .strict()
  .optional();

/** Process domain configuration */
const processSchema = z
  .object({
    pr: processPrSchema,
    branches: processBranchesSchema,
    tickets: processTicketsSchema,
  })
  .strict()
  .optional();

// =============================================================================
// Stack Domain Configuration
// =============================================================================

/** Stack tools configuration */
const stackToolsSchema = z.record(z.string()).optional();

/** Stack domain configuration */
const stackSchema = z
  .object({
    tools: stackToolsSchema,
  })
  .strict()
  .optional();

// =============================================================================
// Full Configuration
// =============================================================================

/** Full check.toml schema */
export const configSchema = z
  .object({
    code: codeSchema,
    process: processSchema,
    stack: stackSchema,
  })
  .strict();

/** Inferred TypeScript type from schema */
export type Config = z.infer<typeof configSchema>;

/** Default configuration */
export const defaultConfig: Config = {
  code: {
    linting: {
      eslint: { enabled: false },
      ruff: { enabled: false, format: false },
    },
    formatting: {
      prettier: { enabled: false },
    },
    types: {
      tsc: { enabled: false },
      ty: { enabled: false },
    },
    unused: {
      knip: { enabled: false },
      vulture: { enabled: false },
    },
    tests: {
      enabled: false,
    },
    security: {
      secrets: { enabled: false },
      npmaudit: { enabled: false },
      pipaudit: { enabled: false },
    },
    complexity: {},
  },
  process: {
    pr: {},
    branches: {},
    tickets: {},
  },
  stack: {
    tools: {},
  },
};

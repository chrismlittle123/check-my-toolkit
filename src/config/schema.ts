import { z } from "zod";

/**
 * Zod schema for check.toml configuration
 */

// =============================================================================
// ESLint Configuration
// =============================================================================

/** ESLint rule values: "off", "warn", "error", or array like ["error", "always"] */
const eslintRuleValueSchema = z.union([
  z.enum(["off", "warn", "error"]),
  z.tuple([z.string()]).rest(z.unknown()),
]);

/** ESLint configuration */
const eslintConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
    rules: z.record(z.string(), eslintRuleValueSchema).optional(),
  })
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
  .optional();

/** Ruff configuration */
const ruffConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
    format: z.boolean().optional().default(false), // Also check formatting with ruff format
    "line-length": z.number().int().positive().optional(),
    lint: ruffLintSchema,
  })
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
  .optional();

// =============================================================================
// Knip Configuration (Unused Code Detection)
// =============================================================================

/** Knip configuration */
const knipConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
  })
  .optional();

// =============================================================================
// Vulture Configuration (Python Dead Code Detection)
// =============================================================================

/** Vulture configuration */
const vultureConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
  })
  .optional();

// =============================================================================
// Prettier Configuration
// =============================================================================

/** Prettier configuration */
const prettierConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
  })
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
  .optional();

/** Code formatting configuration */
const codeFormattingSchema = z
  .object({
    prettier: prettierConfigSchema,
  })
  .optional();

/** Code type checking configuration */
const codeTypesSchema = z
  .object({
    tsc: tscConfigSchema,
  })
  .optional();

/** Code unused detection configuration */
const codeUnusedSchema = z
  .object({
    knip: knipConfigSchema,
    vulture: vultureConfigSchema,
  })
  .optional();

/** Code files configuration */
const codeFilesSchema = z
  .object({
    repo: z.array(z.string()).optional(),
    tooling: z.array(z.string()).optional(),
    docs: z.array(z.string()).optional(),
  })
  .optional();

/** Code domain configuration */
const codeSchema = z
  .object({
    linting: codeLintingSchema,
    formatting: codeFormattingSchema,
    types: codeTypesSchema,
    unused: codeUnusedSchema,
    tests: testsConfigSchema,
    complexity: codeLimitsSchema,
    files: codeFilesSchema,
  })
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
  .optional();

/** Process branches configuration */
const processBranchesSchema = z
  .object({
    pattern: z.string().optional(),
  })
  .optional();

/** Process tickets configuration */
const processTicketsSchema = z
  .object({
    pattern: z.string().optional(),
    check_in: z.array(z.string()).optional(),
  })
  .optional();

/** Process domain configuration */
const processSchema = z
  .object({
    pr: processPrSchema,
    branches: processBranchesSchema,
    tickets: processTicketsSchema,
  })
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
  .optional();

// =============================================================================
// Full Configuration
// =============================================================================

/** Full check.toml schema */
export const configSchema = z.object({
  code: codeSchema,
  process: processSchema,
  stack: stackSchema,
});

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
    },
    unused: {
      knip: { enabled: false },
      vulture: { enabled: false },
    },
    tests: {
      enabled: false,
    },
    complexity: {},
    files: {
      repo: [],
      tooling: [],
      docs: [],
    },
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

import { z } from "zod";

/**
 * Zod schema for check.toml configuration
 */

// =============================================================================
// ESLint Configuration
// =============================================================================

/** ESLint rule values: "off", "warn", "error", or array like ["error", "always"] */
export const eslintRuleValueSchema = z.union([
  z.enum(["off", "warn", "error"]),
  z.tuple([z.string()]).rest(z.unknown()),
]);

/** ESLint configuration */
export const eslintConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
    rules: z.record(z.string(), eslintRuleValueSchema).optional(),
  })
  .optional();

// =============================================================================
// Ruff Configuration
// =============================================================================

/** Ruff lint configuration */
export const ruffLintSchema = z
  .object({
    select: z.array(z.string()).optional(),
    ignore: z.array(z.string()).optional(),
  })
  .optional();

/** Ruff configuration */
export const ruffConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
    "line-length": z.number().int().positive().optional(),
    lint: ruffLintSchema,
  })
  .optional();

// =============================================================================
// TypeScript Configuration
// =============================================================================

/** TypeScript compiler configuration */
export const tscConfigSchema = z
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
// Code Complexity / Limits Configuration
// =============================================================================

/** Code limits configuration */
export const codeLimitsSchema = z
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
export const codeLintingSchema = z
  .object({
    eslint: eslintConfigSchema,
    ruff: ruffConfigSchema,
  })
  .optional();

/** Code type checking configuration */
export const codeTypesSchema = z
  .object({
    tsc: tscConfigSchema,
  })
  .optional();

/** Code files configuration */
export const codeFilesSchema = z
  .object({
    repo: z.array(z.string()).optional(),
    tooling: z.array(z.string()).optional(),
    docs: z.array(z.string()).optional(),
  })
  .optional();

/** Code domain configuration */
export const codeSchema = z
  .object({
    linting: codeLintingSchema,
    types: codeTypesSchema,
    complexity: codeLimitsSchema,
    files: codeFilesSchema,
  })
  .optional();

// =============================================================================
// Process Domain Configuration
// =============================================================================

/** Process PR configuration */
export const processPrSchema = z
  .object({
    max_files: z.number().optional(),
    max_lines: z.number().optional(),
    min_approvals: z.number().optional(),
  })
  .optional();

/** Process branches configuration */
export const processBranchesSchema = z
  .object({
    pattern: z.string().optional(),
  })
  .optional();

/** Process tickets configuration */
export const processTicketsSchema = z
  .object({
    pattern: z.string().optional(),
    check_in: z.array(z.string()).optional(),
  })
  .optional();

/** Process domain configuration */
export const processSchema = z
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
export const stackToolsSchema = z.record(z.string()).optional();

/** Stack domain configuration */
export const stackSchema = z
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
      ruff: { enabled: false },
    },
    types: {
      tsc: { enabled: false },
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

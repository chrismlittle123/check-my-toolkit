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
// Note: TypeScript compiler options (strict, noImplicitAny, etc.) are not configurable
// via check.toml because tsc CLI flags can only ADD strictness, not override tsconfig.json.
// Configure compiler options in your tsconfig.json file.
const tscConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
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
  })
  .strict()
  .optional();

// =============================================================================
// Full Configuration
// =============================================================================

// Note: process and stack domains are not yet implemented.
// They are reserved for future use and will be added when implemented.

/** Full check.toml schema */
export const configSchema = z
  .object({
    code: codeSchema,
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
  },
};

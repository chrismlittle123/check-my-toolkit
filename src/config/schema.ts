import { z } from "zod";

/**
 * Zod schema for check.toml configuration
 */

// =============================================================================
// ESLint Configuration
// =============================================================================

/** ESLint rule severity */
const eslintRuleSeverity = z.enum(["off", "warn", "error"]);

/**
 * ESLint rule with options in TOML-friendly object format.
 * Example: { severity = "error", max = 10 }
 * The 'severity' key is required, all other keys are rule-specific options.
 */
const eslintRuleWithOptions = z
  .object({
    severity: eslintRuleSeverity,
  })
  .catchall(z.unknown()); // Allow any additional options (max, skipBlankLines, etc.)

/**
 * ESLint rule value - can be:
 * - severity string: "error"
 * - object with severity and options: { severity: "error", max: 10 }
 */
const eslintRuleValue = z.union([
  eslintRuleSeverity,
  eslintRuleWithOptions,
]);

/** ESLint rules configuration */
const eslintRulesSchema = z.record(z.string(), eslintRuleValue).optional();

/** ESLint configuration */
const eslintConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
    files: z.array(z.string()).optional(), // Glob patterns for files to lint
    ignore: z.array(z.string()).optional(), // Glob patterns to ignore
    "max-warnings": z.number().int().nonnegative().optional(), // Max warnings before failure
    rules: eslintRulesSchema, // Required rules for audit (verifies eslint.config.js)
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

/** TypeScript compiler options that can be required via audit */
const tscCompilerOptionsSchema = z
  .object({
    strict: z.boolean().optional(),
    noImplicitAny: z.boolean().optional(),
    strictNullChecks: z.boolean().optional(),
    noUnusedLocals: z.boolean().optional(),
    noUnusedParameters: z.boolean().optional(),
    noImplicitReturns: z.boolean().optional(),
    noFallthroughCasesInSwitch: z.boolean().optional(),
    esModuleInterop: z.boolean().optional(),
    skipLibCheck: z.boolean().optional(),
    forceConsistentCasingInFileNames: z.boolean().optional(),
  })
  .strict()
  .optional();

/** TypeScript compiler configuration */
const tscConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    require: tscCompilerOptionsSchema, // Required compiler options for audit
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
    min_test_files: z.number().int().nonnegative().optional(), // Minimum test files required (0 = just verify pattern works)
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
// Naming Conventions Configuration
// =============================================================================

/** Supported case types for naming conventions */
const caseTypeSchema = z.enum(["kebab-case", "snake_case", "camelCase", "PascalCase"]);

/** Single naming rule */
const namingRuleSchema = z
  .object({
    extensions: z.array(z.string()), // e.g., ["ts", "tsx"]
    file_case: caseTypeSchema,
    folder_case: caseTypeSchema,
    exclude: z.array(z.string()).optional(), // Glob patterns to exclude, e.g., ["tests/**"]
  })
  .strict();

/** Naming conventions configuration */
const namingConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    rules: z.array(namingRuleSchema).optional(),
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
    naming: namingConfigSchema,
  })
  .strict()
  .optional();

// =============================================================================
// Extends Configuration
// =============================================================================

/** Extends configuration for inheriting from registries */
const extendsSchema = z
  .object({
    registry: z.string(), // e.g., "github:myorg/standards" or local path
    rulesets: z.array(z.string()), // e.g., ["base", "typescript"]
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
    extends: extendsSchema,
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
    naming: {
      enabled: false,
    },
  },
};

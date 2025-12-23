import { z } from "zod";

/**
 * Zod schema for check.toml configuration
 */

/** Code linting configuration */
export const codeLintingSchema = z
  .object({
    eslint: z.boolean().optional().default(false),
    ruff: z.boolean().optional().default(false),
  })
  .optional();

/** Code type checking configuration */
export const codeTypesSchema = z
  .object({
    tsc: z.boolean().optional().default(false),
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
    files: codeFilesSchema,
  })
  .optional();

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

/** Stack tools configuration */
export const stackToolsSchema = z.record(z.string()).optional();

/** Stack domain configuration */
export const stackSchema = z
  .object({
    tools: stackToolsSchema,
  })
  .optional();

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
      eslint: false,
      ruff: false,
    },
    types: {
      tsc: false,
    },
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

/* eslint-disable max-lines -- schema file contains all domain schemas and grows with features */
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
// Coverage Run Configuration
// =============================================================================

/** Coverage run test runner type */
const coverageRunnerSchema = z.enum(["vitest", "jest", "pytest", "auto"]);

/** Coverage run configuration - runs tests and verifies coverage threshold */
const coverageRunConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    min_threshold: z.number().int().min(0).max(100).optional().default(80), // Minimum coverage percentage
    runner: coverageRunnerSchema.optional().default("auto"), // Test runner to use
    command: z.string().optional(), // Custom command to run tests with coverage
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
    allow_dynamic_routes: z.boolean().optional(), // Allow Next.js/Remix dynamic route folders: [id], [...slug], (group)
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
// Quality Configuration (Disable Comments Detection)
// =============================================================================

/** Disable comments configuration */
const disableCommentsConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    patterns: z.array(z.string()).optional(), // Override default patterns
    extensions: z.array(z.string()).optional(), // File extensions to scan
    exclude: z.array(z.string()).optional(), // Glob patterns to exclude
  })
  .strict()
  .optional();

/** Code quality configuration */
const codeQualitySchema = z
  .object({
    "disable-comments": disableCommentsConfigSchema,
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
    coverage_run: coverageRunConfigSchema,
    security: codeSecuritySchema,
    naming: namingConfigSchema,
    quality: codeQualitySchema,
  })
  .strict()
  .optional();

// =============================================================================
// Process Domain Configuration
// =============================================================================

/** Hook commands configuration - maps hook name to required commands */
const hookCommandsSchema = z.record(z.string(), z.array(z.string())).optional();

/** Git hooks (husky) configuration */
const hooksConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    require_husky: z.boolean().optional().default(true), // Require .husky/ directory
    require_hooks: z.array(z.string()).optional(), // e.g., ["pre-commit", "pre-push"]
    commands: hookCommandsSchema, // e.g., { "pre-commit": ["lint-staged"] }
  })
  .strict()
  .optional();

/** CI/CD workflows configuration */
const ciConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    require_workflows: z.array(z.string()).optional(), // e.g., ["ci.yml", "release.yml"]
    jobs: z.record(z.string(), z.array(z.string())).optional(), // e.g., { "ci.yml": ["test", "lint"] }
    actions: z.record(z.string(), z.array(z.string())).optional(), // e.g., { "ci.yml": ["actions/checkout"] }
  })
  .strict()
  .optional();

/** Branch naming configuration */
const branchesConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    pattern: z.string().optional(), // Regex pattern for branch names
    exclude: z.array(z.string()).optional(), // Branches to skip (e.g., ["main", "master"])
  })
  .strict()
  .optional();

/** Commit message format configuration */
const commitsConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    pattern: z.string().optional(), // Regex pattern for commit messages (e.g., conventional commits)
    types: z.array(z.string()).optional(), // Allowed commit types (e.g., ["feat", "fix", "chore"])
    require_scope: z.boolean().optional().default(false), // Require scope like feat(api): ...
    max_subject_length: z.number().int().positive().optional(), // Max length of subject line
  })
  .strict()
  .optional();

/** Changeset bump type */
const changesetBumpTypeSchema = z.enum(["patch", "minor", "major"]);

/** Changeset validation configuration */
const changesetsConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    require_for_paths: z.array(z.string()).optional(), // Glob patterns that require changesets (e.g., ["src/**"])
    exclude_paths: z.array(z.string()).optional(), // Paths that don't require changesets (e.g., ["**/*.test.ts"])
    validate_format: z.boolean().optional().default(true), // Validate changeset file format (frontmatter, description)
    allowed_bump_types: z.array(changesetBumpTypeSchema).optional(), // Restrict allowed bump types (e.g., ["patch", "minor"])
    require_description: z.boolean().optional().default(true), // Require non-empty description
    min_description_length: z.number().int().positive().optional(), // Minimum description length
  })
  .strict()
  .optional();

/** PR size limits configuration */
const prConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    max_files: z.number().int().positive().optional(), // Max files changed in PR
    max_lines: z.number().int().positive().optional(), // Max lines changed (additions + deletions)
  })
  .strict()
  .optional();

/** Ticket reference validation configuration */
const ticketsConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    pattern: z.string().optional(), // Regex pattern for ticket IDs (e.g., "^(ABC|XYZ)-[0-9]+")
    require_in_commits: z.boolean().optional().default(true), // Require ticket in commit messages
    require_in_branch: z.boolean().optional().default(false), // Require ticket in branch name
  })
  .strict()
  .optional();

/** Coverage enforcement mode */
const coverageEnforceInSchema = z.enum(["ci", "config", "both"]);

/** Coverage enforcement configuration */
const coverageConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    min_threshold: z.number().int().min(0).max(100).optional(), // Minimum coverage percentage
    enforce_in: coverageEnforceInSchema.optional().default("config"), // Where to verify coverage
    ci_workflow: z.string().optional(), // Workflow file to check (e.g., "ci.yml")
    ci_job: z.string().optional(), // Job name to check (e.g., "test")
  })
  .strict()
  .optional();

/** Branch protection settings configuration */
const branchProtectionConfigSchema = z
  .object({
    branch: z.string().optional().default("main"), // Branch to check (default: main)
    required_reviews: z.number().int().min(0).optional(), // Minimum required reviews
    dismiss_stale_reviews: z.boolean().optional(), // Dismiss stale reviews on new commits
    require_code_owner_reviews: z.boolean().optional(), // Require CODEOWNER review
    require_status_checks: z.array(z.string()).optional(), // Required status checks
    require_branches_up_to_date: z.boolean().optional(), // Require branch to be up to date
    require_signed_commits: z.boolean().optional(), // Require signed commits
    enforce_admins: z.boolean().optional(), // Enforce rules for admins too
  })
  .strict()
  .optional();

/** Repository settings configuration */
const repoConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    require_branch_protection: z.boolean().optional().default(false), // Check branch protection exists
    require_codeowners: z.boolean().optional().default(false), // Check CODEOWNERS file exists
    branch_protection: branchProtectionConfigSchema, // Detailed branch protection requirements
  })
  .strict()
  .optional();

/** S3 backup verification configuration */
const backupsConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    bucket: z.string().optional(), // S3 bucket name
    prefix: z.string().optional(), // S3 key prefix
    max_age_hours: z.number().int().positive().optional().default(24), // Max age of most recent backup
    region: z.string().optional(), // AWS region (defaults to AWS_REGION env)
  })
  .strict()
  .optional();

/** Single CODEOWNERS rule */
const codeownersRuleSchema = z
  .object({
    pattern: z.string(), // File pattern (e.g., "/check.toml", "*.js", "/src/api/*")
    owners: z.array(z.string()), // Owner handles (e.g., ["@user", "@org/team"])
  })
  .strict();

/** CODEOWNERS validation configuration */
const codeownersConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    rules: z.array(codeownersRuleSchema).optional(), // Required rules in CODEOWNERS
  })
  .strict()
  .optional();

/** Process domain configuration */
const processSchema = z
  .object({
    hooks: hooksConfigSchema,
    ci: ciConfigSchema,
    branches: branchesConfigSchema,
    commits: commitsConfigSchema,
    changesets: changesetsConfigSchema,
    pr: prConfigSchema,
    tickets: ticketsConfigSchema,
    coverage: coverageConfigSchema,
    repo: repoConfigSchema,
    backups: backupsConfigSchema,
    codeowners: codeownersConfigSchema,
  })
  .strict()
  .optional();

// =============================================================================
// Infra Domain Configuration
// =============================================================================

/** Tagging configuration */
const taggingConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    region: z.string().optional(),
    required: z.array(z.string()).optional(),
    values: z.record(z.string(), z.array(z.string())).optional(),
  })
  .strict()
  .optional();

/** Infra domain configuration */
const infraSchema = z
  .object({
    tagging: taggingConfigSchema,
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

// Note: stack domain is not yet implemented.
// It is reserved for future use and will be added when implemented.

/** Full check.toml schema */
export const configSchema = z
  .object({
    extends: extendsSchema,
    code: codeSchema,
    process: processSchema,
    infra: infraSchema,
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
    coverage_run: {
      enabled: false,
      min_threshold: 80,
      runner: "auto",
    },
    security: {
      secrets: { enabled: false },
      npmaudit: { enabled: false },
      pipaudit: { enabled: false },
    },
    naming: {
      enabled: false,
    },
    quality: {
      "disable-comments": { enabled: false },
    },
  },
  process: {
    hooks: {
      enabled: false,
      require_husky: true,
    },
    ci: {
      enabled: false,
    },
    branches: {
      enabled: false,
    },
    commits: {
      enabled: false,
      require_scope: false,
    },
    changesets: {
      enabled: false,
      validate_format: true,
      require_description: true,
    },
    pr: {
      enabled: false,
    },
    tickets: {
      enabled: false,
      require_in_commits: true,
      require_in_branch: false,
    },
    coverage: {
      enabled: false,
      enforce_in: "config",
    },
    repo: {
      enabled: false,
      require_branch_protection: false,
      require_codeowners: false,
    },
    backups: {
      enabled: false,
      max_age_hours: 24,
    },
    codeowners: {
      enabled: false,
    },
  },
  infra: {
    tagging: {
      enabled: false,
    },
  },
};

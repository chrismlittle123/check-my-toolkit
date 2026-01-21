#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import chalk from "chalk";
import { Command, type CommanderError, Option } from "commander";
import { zodToJsonSchema } from "zod-to-json-schema";

import { auditCodeConfig, runCodeChecks } from "./code/index.js";
import { ConfigError, getProjectRoot, loadConfig, loadConfigAsync } from "./config/index.js";
import { configSchema } from "./config/schema.js";
import { type DependenciesOptions, runDependencies } from "./dependencies/index.js";
import { auditInfraConfig, runInfraChecks } from "./infra/index.js";
import { formatOutput, type OutputFormat } from "./output/index.js";
import { checkBranchCommand, checkCommitCommand } from "./process/commands/index.js";
import { auditProcessConfig, runProcessChecks } from "./process/index.js";
import { type DetectOptions, runDetect } from "./projects/index.js";
import { type DomainResult, ExitCode, type FullResult } from "./types/index.js";

// Read version from package.json to avoid hardcoding
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as { version: string };
const VERSION = packageJson.version;

const program = new Command();

program
  .name("cm")
  .description("Unified project health checks for code quality")
  .version(VERSION)
  .exitOverride((err: CommanderError) => {
    // Commander uses exit code 1 for all errors by default
    // We want to use exit code 2 (CONFIG_ERROR) for argument/option errors
    if (
      err.code === "commander.invalidArgument" ||
      err.code === "commander.optionMissingArgument"
    ) {
      process.exit(ExitCode.CONFIG_ERROR);
    }
    // For other Commander errors (help, version), use the default exit code
    process.exit(err.exitCode);
  })
  .configureOutput({
    writeErr: (str: string) => {
      // Write errors to stderr without the default "error:" prefix duplication
      process.stderr.write(str);
    },
  });

// =============================================================================
// Shared action handlers
// =============================================================================

type DomainFilter = "code" | "process" | "infra" | undefined;

function shouldRunDomain(filter: DomainFilter, domain: "code" | "process" | "infra"): boolean {
  return !filter || filter === domain;
}

function buildResult(configPath: string, domains: Record<string, DomainResult>): FullResult {
  const totalViolations = Object.values(domains).reduce((sum, d) => sum + d.violationCount, 0);
  return {
    version: VERSION,
    configPath,
    domains,
    summary: {
      totalViolations,
      exitCode: totalViolations > 0 ? ExitCode.VIOLATIONS_FOUND : ExitCode.SUCCESS,
    },
  };
}

function handleError(error: unknown): never {
  if (error instanceof ConfigError) {
    console.error(chalk.red(`Config error: ${error.message}`));
    process.exit(ExitCode.CONFIG_ERROR);
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(chalk.red(`Error: ${message}`));
  process.exit(ExitCode.RUNTIME_ERROR);
}

async function runCheck(
  options: { config?: string; format: string },
  domain?: DomainFilter
): Promise<void> {
  try {
    const { config, configPath } = await loadConfigAsync(options.config);
    const projectRoot = getProjectRoot(configPath);

    const domains: Record<string, DomainResult> = {};
    if (shouldRunDomain(domain, "code")) {
      domains.code = await runCodeChecks(projectRoot, config);
    }
    if (shouldRunDomain(domain, "process")) {
      domains.process = await runProcessChecks(projectRoot, config);
    }
    if (shouldRunDomain(domain, "infra")) {
      domains.infra = await runInfraChecks(projectRoot, config);
    }

    const result = buildResult(configPath, domains);
    process.stdout.write(`${formatOutput(result, options.format as OutputFormat)}\n`);
    process.exit(result.summary.exitCode);
  } catch (error) {
    handleError(error);
  }
}

async function runAudit(
  options: { config?: string; format: string },
  domain?: DomainFilter
): Promise<void> {
  try {
    const { config, configPath } = await loadConfigAsync(options.config);
    const projectRoot = getProjectRoot(configPath);

    const domains: Record<string, DomainResult> = {};
    if (shouldRunDomain(domain, "code")) {
      domains.code = await auditCodeConfig(projectRoot, config);
    }
    if (shouldRunDomain(domain, "process")) {
      domains.process = await auditProcessConfig(projectRoot, config);
    }
    if (shouldRunDomain(domain, "infra")) {
      domains.infra = await auditInfraConfig(projectRoot, config);
    }

    const result = buildResult(configPath, domains);
    process.stdout.write(`${formatOutput(result, options.format as OutputFormat)}\n`);
    process.exit(result.summary.exitCode);
  } catch (error) {
    handleError(error);
  }
}

// =============================================================================
// Validate subcommand
// =============================================================================

const validateCommand = new Command("validate").description("Validate configuration files");

// cm validate config - validate check.toml
validateCommand
  .command("config")
  .description("Validate check.toml configuration file")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action(async (options: { config?: string; format: string }) => {
    try {
      // Use async loader to validate extends registry and rulesets
      const { configPath } = await loadConfigAsync(options.config);

      if (options.format === "json") {
        process.stdout.write(`${JSON.stringify({ valid: true, configPath }, null, 2)}\n`);
      } else {
        process.stdout.write(chalk.green(`✓ Valid: ${configPath}\n`));
      }
      process.exit(ExitCode.SUCCESS);
    } catch (error) {
      if (error instanceof ConfigError) {
        if (options.format === "json") {
          process.stdout.write(
            `${JSON.stringify({ valid: false, error: error.message }, null, 2)}\n`
          );
        } else {
          console.error(chalk.red(`✗ Invalid: ${error.message}`));
        }
        process.exit(ExitCode.CONFIG_ERROR);
      }
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
      );
      process.exit(ExitCode.RUNTIME_ERROR);
    }
  });

// cm validate registry - validate registry structure
interface RegistryError {
  file: string;
  error: string;
}
interface RegistryValidation {
  count: number;
  errors: RegistryError[];
}

function validateRulesets(cwd: string): RegistryValidation {
  const dir = path.join(cwd, "rulesets");
  if (!fs.existsSync(dir)) {
    return { count: 0, errors: [{ file: "rulesets/", error: "Directory does not exist" }] };
  }
  const errors: RegistryError[] = [];
  let count = 0;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".toml"))) {
    try {
      loadConfig(path.join(dir, file));
      count++;
    } catch (error) {
      errors.push({
        file: `rulesets/${file}`,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  return { count, errors };
}

interface RegistryResult {
  valid: boolean;
  rulesetsCount: number;
  errors: RegistryError[];
}

function outputRegistryResult(result: RegistryResult, format: string): void {
  const { valid, rulesetsCount, errors } = result;
  if (format === "json") {
    process.stdout.write(`${JSON.stringify({ valid, rulesetsCount, errors }, null, 2)}\n`);
  } else if (valid) {
    process.stdout.write(chalk.green(`✓ Registry valid\n`));
    process.stdout.write(`  Rulesets: ${rulesetsCount} valid\n`);
  } else {
    console.error(chalk.red(`✗ Registry invalid\n`));
    errors.forEach(({ file, error }) => console.error(chalk.red(`  ${file}: ${error}`)));
  }
}

validateCommand
  .command("registry")
  .description("Validate registry structure (rulesets/*.toml)")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action(async (options: { format: string }) => {
    const rulesets = validateRulesets(process.cwd());
    const { count: rulesetsCount, errors } = rulesets;
    const valid = errors.length === 0;
    outputRegistryResult({ valid, rulesetsCount, errors }, options.format);
    process.exit(valid ? ExitCode.SUCCESS : ExitCode.CONFIG_ERROR);
  });

// cm validate tier - validate tier-ruleset alignment
validateCommand
  .command("tier")
  .description("Validate tier-ruleset alignment (repo-metadata.yaml vs check.toml)")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action(async (options: { config?: string; format: string }) => {
    try {
      const { validateTierRuleset, formatTierResultText, formatTierResultJson } =
        await import("./validate/index.js");
      const result = validateTierRuleset({ config: options.config });

      const output =
        options.format === "json" ? formatTierResultJson(result) : formatTierResultText(result);

      process.stdout.write(`${output}\n`);
      process.exit(result.valid ? ExitCode.SUCCESS : ExitCode.CONFIG_ERROR);
    } catch (error) {
      if (error instanceof ConfigError) {
        if (options.format === "json") {
          process.stdout.write(
            `${JSON.stringify({ valid: false, error: error.message }, null, 2)}\n`
          );
        } else {
          console.error(chalk.red(`✗ Error: ${error.message}`));
        }
        process.exit(ExitCode.CONFIG_ERROR);
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(chalk.red(`Error: ${message}`));
      process.exit(ExitCode.RUNTIME_ERROR);
    }
  });

program.addCommand(validateCommand);

// =============================================================================
// Schema subcommand
// =============================================================================

const schemaCommand = new Command("schema").description(
  "Output JSON schemas for configuration files"
);

// cm schema config - output check.toml JSON schema
schemaCommand
  .command("config")
  .description("Output JSON schema for check.toml configuration")
  .action(() => {
    const jsonSchema = zodToJsonSchema(configSchema, {
      name: "CheckTomlConfig",
      $refStrategy: "none",
    });
    process.stdout.write(`${JSON.stringify(jsonSchema, null, 2)}\n`);
  });

program.addCommand(schemaCommand);

// =============================================================================
// Code subcommand
// =============================================================================

const codeCommand = new Command("code").description("Code quality checks");

// cm code check
codeCommand
  .command("check")
  .description("Run linting and type checking tools")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action((options) => runCheck(options, "code"));

// cm code audit
codeCommand
  .command("audit")
  .description("Verify linting and type checking configs exist")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action((options) => runAudit(options, "code"));

program.addCommand(codeCommand);

// =============================================================================
// Process subcommand
// =============================================================================

const processCommand = new Command("process").description("Workflow and process checks");

// cm process check
processCommand
  .command("check")
  .description("Run workflow validation (hooks, CI, etc.)")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action((options) => runCheck(options, "process"));

// cm process audit
processCommand
  .command("audit")
  .description("Verify workflow configs exist")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action((options) => runAudit(options, "process"));

// cm process diff
processCommand
  .command("diff")
  .description("Show repository setting differences (current vs. config)")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action(async (options: { config?: string; format: string }) => {
    const { runDiff } = await import("./process/sync/index.js");
    await runDiff({ config: options.config, format: options.format as "text" | "json" });
  });

// cm process sync
processCommand
  .command("sync")
  .description("Synchronize repository settings to match config")
  .option("-c, --config <path>", "Path to check.toml config file")
  .option("--apply", "Actually apply changes (required for safety)")
  .option("--validate-actors", "Validate bypass actor IDs against GitHub API before applying")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action(async (options: { config?: string; format: string; apply?: boolean; validateActors?: boolean }) => {
    const { runSync } = await import("./process/sync/index.js");
    await runSync({
      config: options.config,
      format: options.format as "text" | "json",
      apply: options.apply,
      validateActors: options.validateActors,
    });
  });

// cm process diff-tags
processCommand
  .command("diff-tags")
  .description("Show tag protection differences (current vs. config)")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action(async (options: { config?: string; format: string }) => {
    const { runTagDiff } = await import("./process/sync/index.js");
    await runTagDiff({ config: options.config, format: options.format as "text" | "json" });
  });

// cm process sync-tags
processCommand
  .command("sync-tags")
  .description("Synchronize tag protection ruleset to match config")
  .option("-c, --config <path>", "Path to check.toml config file")
  .option("--apply", "Actually apply changes (required for safety)")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action(async (options: { config?: string; format: string; apply?: boolean }) => {
    const { runTagSync } = await import("./process/sync/index.js");
    await runTagSync({
      config: options.config,
      format: options.format as "text" | "json",
      apply: options.apply,
    });
  });

// cm process list-rules
processCommand
  .command("list-rules")
  .description("List all branch protection rules (classic and rulesets)")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .option("-b, --branches <branches>", "Comma-separated list of branches to check", "main,master,develop")
  .action(async (options: { format: string; branches: string }) => {
    const {
      listAllProtection,
      formatProtectionPlan,
    } = await import("./process/sync/cleanup.js");
    const { getRepoInfo, isGhAvailable } = await import("./process/sync/fetcher.js");

    if (!(await isGhAvailable())) {
      console.error("GitHub CLI (gh) is not available");
      process.exit(1);
    }

    try {
      const repoInfo = await getRepoInfo(process.cwd());
      const branches = options.branches.split(",").map((b) => b.trim());
      const plan = await listAllProtection(repoInfo, branches);

      if (options.format === "json") {
        process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
      } else {
        process.stdout.write(`${formatProtectionPlan(plan)}\n`);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// cm process cleanup-rules
processCommand
  .command("cleanup-rules")
  .description("Remove orphaned classic branch protection rules")
  .option("--apply", "Actually remove rules (required for safety)")
  .option("-b, --branches <branches>", "Comma-separated list of branches to check", "main,master,develop")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action(async (options: { apply?: boolean; branches: string; format: string }) => {
    const { runCleanupRules } = await import("./process/sync/cleanup.js");
    const { getRepoInfo, isGhAvailable } = await import("./process/sync/fetcher.js");

    if (!(await isGhAvailable())) {
      console.error("GitHub CLI (gh) is not available");
      process.exit(1);
    }

    try {
      const repoInfo = await getRepoInfo(process.cwd());
      const branches = options.branches.split(",").map((b) => b.trim());
      await runCleanupRules(repoInfo, branches, options.apply ?? false);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// cm process check-branch
processCommand
  .command("check-branch")
  .description("Validate current branch name (for pre-push hook)")
  .option("-c, --config <path>", "Path to check.toml config file")
  .option("-q, --quiet", "Minimal output for hooks")
  .action(async (options: { config?: string; quiet?: boolean }) => {
    try {
      const exitCode = await checkBranchCommand(options);
      process.exit(exitCode);
    } catch (error) {
      handleError(error);
    }
  });

// cm process check-commit <file>
processCommand
  .command("check-commit <file>")
  .description("Validate commit message (for commit-msg hook)")
  .option("-c, --config <path>", "Path to check.toml config file")
  .option("-q, --quiet", "Minimal output for hooks")
  .action(async (file: string, options: { config?: string; quiet?: boolean }) => {
    try {
      const exitCode = await checkCommitCommand(file, options);
      process.exit(exitCode);
    } catch (error) {
      handleError(error);
    }
  });

program.addCommand(processCommand);

// =============================================================================
// Infra subcommand
// =============================================================================

const infraCommand = new Command("infra").description("Infrastructure validation checks");

// cm infra check
infraCommand
  .command("check")
  .description("Run infrastructure checks (tagging, etc.)")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action((options) => runCheck(options, "infra"));

// cm infra audit
infraCommand
  .command("audit")
  .description("Verify infrastructure configs exist")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action((options) => runAudit(options, "infra"));

program.addCommand(infraCommand);

// =============================================================================
// Dependencies command
// =============================================================================

// cm dependencies - list config files tracked by enabled checks
program
  .command("dependencies")
  .description("List config files tracked by enabled checks (for drift-toolkit)")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .option("--check <name>", "Filter to specific check (e.g., eslint)")
  .option("--project <path>", "Monorepo project path")
  .action(
    async (options: { config?: string; format: string; check?: string; project?: string }) => {
      try {
        await runDependencies(options as DependenciesOptions);
        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(error);
      }
    }
  );

// =============================================================================
// Projects subcommand
// =============================================================================

const projectsCommand = new Command("projects").description("Project management utilities");

// cm projects detect
projectsCommand
  .command("detect")
  .description("Discover projects and show which have/don't have check.toml")
  .option("--fix", "Create missing check.toml files")
  .option("--dry-run", "Show what would be created without creating")
  .option("--registry <path>", "Create shared registry and extend from it")
  .option("--show-status", "Show tier from repo-metadata.yaml")
  .option("--missing-config", "Filter to projects without check.toml")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action(async (options) => {
    try {
      await runDetect(options as DetectOptions);
      process.exit(ExitCode.SUCCESS);
    } catch (error) {
      handleError(error);
    }
  });

program.addCommand(projectsCommand);

// =============================================================================
// Top-level aliases (run all domains)
// =============================================================================

// cm check - run all domain checks
program
  .command("check")
  .description("Run all checks (code + process + infra)")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action((options: { config?: string; format: string }) => runCheck(options));

// cm audit - run all domain audits
program
  .command("audit")
  .description("Verify all configs exist (code + process + infra)")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(
    new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text")
  )
  .action((options) => runAudit(options));

program.parse();

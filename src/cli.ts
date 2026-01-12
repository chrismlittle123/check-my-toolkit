#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import chalk from "chalk";
import { Command, Option } from "commander";
import { zodToJsonSchema } from "zod-to-json-schema";

import { auditCodeConfig, runCodeChecks } from "./code/index.js";
import { ConfigError, getProjectRoot, loadConfig, loadConfigAsync } from "./config/index.js";
import { configSchema } from "./config/schema.js";
import { formatOutput, type OutputFormat } from "./output/index.js";
import { auditProcessConfig, runProcessChecks } from "./process/index.js";
import { type DetectOptions,runDetect } from "./projects/index.js";
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
  .version(VERSION);

// =============================================================================
// Shared action handlers
// =============================================================================

type DomainFilter = "code" | "process" | undefined;

function shouldRunDomain(filter: DomainFilter, domain: "code" | "process"): boolean {
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

async function runCheck(options: { config?: string; format: string }, domain?: DomainFilter): Promise<void> {
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

    const result = buildResult(configPath, domains);
    process.stdout.write(`${formatOutput(result, options.format as OutputFormat)}\n`);
    process.exit(result.summary.exitCode);
  } catch (error) {
    handleError(error);
  }
}

async function runAudit(options: { config?: string; format: string }, domain?: DomainFilter): Promise<void> {
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
  .addOption(new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text"))
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
          process.stdout.write(`${JSON.stringify({ valid: false, error: error.message }, null, 2)}\n`);
        } else {
          console.error(chalk.red(`✗ Invalid: ${error.message}`));
        }
        process.exit(ExitCode.CONFIG_ERROR);
      }
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
      process.exit(ExitCode.RUNTIME_ERROR);
    }
  });

// cm validate registry - validate registry structure
interface RegistryError { file: string; error: string }
interface RegistryValidation { count: number; errors: RegistryError[] }

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
      errors.push({ file: `rulesets/${file}`, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  return { count, errors };
}

interface RegistryResult { valid: boolean; rulesetsCount: number; errors: RegistryError[] }

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
  .addOption(new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text"))
  .action(async (options: { format: string }) => {
    const rulesets = validateRulesets(process.cwd());
    const { count: rulesetsCount, errors } = rulesets;
    const valid = errors.length === 0;
    outputRegistryResult({ valid, rulesetsCount, errors }, options.format);
    process.exit(valid ? ExitCode.SUCCESS : ExitCode.CONFIG_ERROR);
  });

program.addCommand(validateCommand);

// =============================================================================
// Schema subcommand
// =============================================================================

const schemaCommand = new Command("schema").description("Output JSON schemas for configuration files");

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
  .addOption(new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text"))
  .action((options) => runCheck(options, "code"));

// cm code audit
codeCommand
  .command("audit")
  .description("Verify linting and type checking configs exist")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text"))
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
  .addOption(new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text"))
  .action((options) => runCheck(options, "process"));

// cm process audit
processCommand
  .command("audit")
  .description("Verify workflow configs exist")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text"))
  .action((options) => runAudit(options, "process"));

program.addCommand(processCommand);

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
  .addOption(new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text"))
  .action(async (options: { fix?: boolean; dryRun?: boolean; registry?: string; format: string }) => {
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
  .description("Run all checks (code + process)")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text"))
  .action((options) => runCheck(options));

// cm audit - run all domain audits
program
  .command("audit")
  .description("Verify all configs exist (code + process)")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text"))
  .action((options) => runAudit(options));

program.parse();

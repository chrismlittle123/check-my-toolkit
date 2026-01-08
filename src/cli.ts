#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import chalk from "chalk";
import { Command, Option } from "commander";

import { auditCodeConfig, runCodeChecks } from "./code/index.js";
import { ConfigError, getProjectRoot, loadConfig, loadConfigAsync } from "./config/index.js";
import { formatOutput, type OutputFormat } from "./output/index.js";
import { ExitCode, type FullResult } from "./types/index.js";

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

async function runCheck(options: { config?: string; format: string }): Promise<void> {
  try {
    const { config, configPath } = await loadConfigAsync(options.config);
    const projectRoot = getProjectRoot(configPath);

    const domainResult = await runCodeChecks(projectRoot, config);

    const result: FullResult = {
      version: VERSION,
      configPath,
      domains: {
        code: domainResult,
      },
      summary: {
        totalViolations: domainResult.violationCount,
        exitCode: domainResult.violationCount > 0 ? ExitCode.VIOLATIONS_FOUND : ExitCode.SUCCESS,
      },
    };

    process.stdout.write(`${formatOutput(result, options.format as OutputFormat)}\n`);
    process.exit(result.summary.exitCode);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(chalk.red(`Config error: ${error.message}`));
      process.exit(ExitCode.CONFIG_ERROR);
    }
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
    process.exit(ExitCode.RUNTIME_ERROR);
  }
}

async function runAudit(options: { config?: string; format: string }): Promise<void> {
  try {
    const { config, configPath } = await loadConfigAsync(options.config);
    const projectRoot = getProjectRoot(configPath);

    const domainResult = await auditCodeConfig(projectRoot, config);

    const result: FullResult = {
      version: VERSION,
      configPath,
      domains: {
        code: domainResult,
      },
      summary: {
        totalViolations: domainResult.violationCount,
        exitCode: domainResult.violationCount > 0 ? ExitCode.VIOLATIONS_FOUND : ExitCode.SUCCESS,
      },
    };

    process.stdout.write(`${formatOutput(result, options.format as OutputFormat)}\n`);
    process.exit(result.summary.exitCode);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(chalk.red(`Config error: ${error.message}`));
      process.exit(ExitCode.CONFIG_ERROR);
    }
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
    process.exit(ExitCode.RUNTIME_ERROR);
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
// Code subcommand
// =============================================================================

const codeCommand = new Command("code").description("Code quality checks");

// cm code check
codeCommand
  .command("check")
  .description("Run linting and type checking tools")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text"))
  .action(runCheck);

// cm code audit
codeCommand
  .command("audit")
  .description("Verify linting and type checking configs exist")
  .option("-c, --config <path>", "Path to check.toml config file")
  .addOption(new Option("-f, --format <format>", "Output format").choices(["text", "json"]).default("text"))
  .action(runAudit);

program.addCommand(codeCommand);

program.parse();

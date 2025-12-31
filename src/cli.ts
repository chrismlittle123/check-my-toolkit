#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import chalk from "chalk";
import { Command } from "commander";

import { auditCodeConfig, runCodeChecks } from "./code/index.js";
import { ConfigError, getProjectRoot, loadConfig } from "./config/index.js";
import { formatOutput, type OutputFormat } from "./output/index.js";
import { ExitCode, type FullResult } from "./types/index.js";

const VERSION = "0.2.0";

const program = new Command();

program
  .name("cm")
  .description("Unified project health checks - code, process, and stack")
  .version(VERSION);

// =============================================================================
// Shared action handlers
// =============================================================================

async function runCheck(options: { config?: string; format: string }): Promise<void> {
  try {
    const { config, configPath } = loadConfig(options.config);
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
    const { config, configPath } = loadConfig(options.config);
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
// Top-level commands
// =============================================================================

// cm init - create check.toml with defaults
program
  .command("init")
  .description("Create check.toml with default configuration")
  .option("--force", "Overwrite existing check.toml")
  .action((options: { force?: boolean }) => {
    const configPath = join(process.cwd(), "check.toml");

    if (existsSync(configPath) && !options.force) {
      console.error(chalk.red("check.toml already exists. Use --force to overwrite."));
      process.exit(ExitCode.CONFIG_ERROR);
    }

    const defaultConfig = `# check-my-toolkit configuration
# https://github.com/chrismlittle123/check-my-toolkit

[code.linting.eslint]
enabled = true

[code.linting.ruff]
enabled = false

[code.types.tsc]
enabled = true
`;

    writeFileSync(configPath, defaultConfig);
    process.stdout.write(chalk.green(`✓ Created ${configPath}\n`));
    process.exit(ExitCode.SUCCESS);
  });

// cm validate - validate check.toml
program
  .command("validate")
  .description("Validate check.toml configuration file")
  .option("-c, --config <path>", "Path to check.toml config file")
  .option("-f, --format <format>", "Output format: text or json", "text")
  .action((options: { config?: string; format: string }) => {
    try {
      const { configPath } = loadConfig(options.config);

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

// =============================================================================
// Code subcommand
// =============================================================================

const codeCommand = new Command("code").description("Code quality checks");

// cm code check
codeCommand
  .command("check")
  .description("Run linting and type checking tools")
  .option("-c, --config <path>", "Path to check.toml config file")
  .option("-f, --format <format>", "Output format: text or json", "text")
  .action(runCheck);

// cm code audit
codeCommand
  .command("audit")
  .description("Verify linting and type checking configs exist")
  .option("-c, --config <path>", "Path to check.toml config file")
  .option("-f, --format <format>", "Output format: text or json", "text")
  .action(runAudit);

program.addCommand(codeCommand);

program.parse();

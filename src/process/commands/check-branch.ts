import { loadConfigAsync } from "../../config/loader.js";
import { type Config } from "../../config/schema.js";
import { type CheckResult } from "../../types/index.js";
import { BranchesRunner } from "../tools/branches.js";

interface CheckBranchOptions {
  config?: string;
  quiet?: boolean;
}

type BranchesConfig = NonNullable<NonNullable<Config["process"]>["branches"]>;

/** Output a success message if not in quiet mode */
function logSuccess(quiet: boolean | undefined): void {
  if (!quiet) {
    console.warn("✓ Branch name is valid");
  }
}

/** Output a skip message if not in quiet mode */
function logSkip(message: string, quiet: boolean | undefined): void {
  if (!quiet) {
    console.warn(`○ ${message}`);
  }
}

/** Output a disabled message if not in quiet mode */
function logDisabled(quiet: boolean | undefined): void {
  if (!quiet) {
    console.warn("Branch naming check is not enabled in check.toml");
  }
}

/** Output failure details */
function logFailure(violations: { message: string }[], pattern: string | undefined, quiet: boolean | undefined): void {
  for (const violation of violations) {
    console.error(`✗ ${violation.message}`);
  }

  if (!quiet && pattern) {
    console.error("");
    console.error(`Expected pattern: ${pattern}`);
    console.error("");
    console.error("Examples:");
    console.error("  feature/v1.0.0/add-login");
    console.error("  fix/v1.0.1/broken-button");
  }
}

/** Run the branches validation and return the result */
async function runBranchValidation(branchesConfig: BranchesConfig): Promise<CheckResult> {
  const runner = new BranchesRunner();
  runner.setConfig(branchesConfig);
  return runner.run(process.cwd());
}

/** Handle the result of the branch validation */
function handleResult(result: CheckResult, branchesConfig: BranchesConfig, quiet: boolean | undefined): number {
  if (result.skipped) {
    logSkip(result.skipReason ?? "Check skipped", quiet);
    return 0;
  }

  if (result.passed) {
    logSuccess(quiet);
    return 0;
  }

  logFailure(result.violations, branchesConfig.pattern, quiet);
  return 1;
}

/**
 * Hook-friendly command to validate branch naming.
 * Designed for use in pre-push hooks.
 *
 * @param options - Command options
 * @returns Exit code (0 = success, 1 = violation)
 */
export async function checkBranchCommand(options: CheckBranchOptions): Promise<number> {
  const { config } = await loadConfigAsync(options.config);
  const branchesConfig = config.process?.branches;

  if (!branchesConfig?.enabled) {
    logDisabled(options.quiet);
    return 0;
  }

  const result = await runBranchValidation(branchesConfig);
  return handleResult(result, branchesConfig, options.quiet);
}

import { getProjectRoot, loadConfigAsync } from "../../config/loader.js";
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

/** Show help for issue-based branch naming */
function showIssueExamples(): void {
  console.error("");
  console.error("Examples (with issue number):");
  console.error("  feature/123/add-login");
  console.error("  fix/456/broken-button");
  console.error("  hotfix/789/security-patch");
}

/** Show help for pattern-based branch naming */
function showPatternExamples(): void {
  console.error("");
  console.error("Examples:");
  console.error("  feature/v1.0.0/add-login");
  console.error("  fix/v1.0.1/broken-button");
}

/** Output failure details */
function logFailure(
  violations: { message: string; rule?: string }[],
  branchesConfig: BranchesConfig,
  quiet: boolean | undefined
): void {
  for (const violation of violations) {
    console.error(`✗ ${violation.message}`);
  }

  if (quiet) {
    return;
  }

  const hasPatternViolation = violations.some((v) => v.rule?.includes("pattern"));
  const hasIssueViolation = violations.some((v) => v.rule?.includes("require_issue"));

  if (hasPatternViolation && branchesConfig.pattern) {
    console.error("");
    console.error(`Expected pattern: ${branchesConfig.pattern}`);
  }

  if (hasIssueViolation || branchesConfig.require_issue) {
    showIssueExamples();
  } else if (hasPatternViolation) {
    showPatternExamples();
  }
}

/** Run the branches validation and return the result */
async function runBranchValidation(
  projectRoot: string,
  branchesConfig: BranchesConfig
): Promise<CheckResult> {
  const runner = new BranchesRunner();
  runner.setConfig(branchesConfig);
  return runner.run(projectRoot);
}

/** Handle the result of the branch validation */
function handleResult(
  result: CheckResult,
  branchesConfig: BranchesConfig,
  quiet: boolean | undefined
): number {
  if (result.skipped) {
    logSkip(result.skipReason ?? "Check skipped", quiet);
    return 0;
  }

  if (result.passed) {
    logSuccess(quiet);
    return 0;
  }

  logFailure(result.violations, branchesConfig, quiet);
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
  const { config, configPath } = await loadConfigAsync(options.config);
  const projectRoot = getProjectRoot(configPath);
  const branchesConfig = config.process?.branches;

  if (!branchesConfig?.enabled) {
    logDisabled(options.quiet);
    return 0;
  }

  const result = await runBranchValidation(projectRoot, branchesConfig);
  return handleResult(result, branchesConfig, options.quiet);
}

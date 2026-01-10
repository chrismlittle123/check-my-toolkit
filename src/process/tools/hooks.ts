import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseProcessToolRunner } from "./base.js";

/** Hooks configuration from check.toml */
interface HooksConfig {
  enabled?: boolean;
  require_husky?: boolean;
  require_hooks?: string[];
  commands?: Record<string, string[]>;
}

/**
 * Git hooks validation runner.
 * Checks that husky is installed and required hooks are configured.
 */
export class HooksRunner extends BaseProcessToolRunner {
  readonly name = "Hooks";
  readonly rule = "process.hooks";
  readonly toolId = "hooks";

  private config: HooksConfig = {
    enabled: false,
    require_husky: true,
  };

  /**
   * Set configuration from check.toml
   */
  setConfig(config: HooksConfig): void {
    this.config = { ...this.config, ...config };
  }

  /** Check if husky is installed */
  private checkHuskyInstalled(projectRoot: string): Violation | null {
    if (this.config.require_husky === false) {
      return null;
    }
    if (this.directoryExists(projectRoot, ".husky")) {
      return null;
    }
    return {
      rule: `${this.rule}.husky`,
      tool: this.toolId,
      message: "Husky not installed (.husky/ directory not found)",
      severity: "error",
    };
  }

  /** Check that required hooks exist */
  private checkRequiredHooks(projectRoot: string): Violation[] {
    const hooks = this.config.require_hooks ?? [];
    return hooks
      .filter((hook) => !this.fileExists(projectRoot, `.husky/${hook}`))
      .map((hook) => ({
        rule: `${this.rule}.${hook}`,
        tool: this.toolId,
        file: `.husky/${hook}`,
        message: `Required hook '${hook}' not found`,
        severity: "error" as const,
      }));
  }

  /** Check that hooks contain required commands */
  private checkHookCommands(projectRoot: string): Violation[] {
    const commands = this.config.commands ?? {};
    const violations: Violation[] = [];

    for (const [hook, requiredCommands] of Object.entries(commands)) {
      const hookPath = `.husky/${hook}`;
      if (!this.fileExists(projectRoot, hookPath)) {
        continue;
      }
      for (const command of requiredCommands) {
        if (!this.fileContains(projectRoot, hookPath, command)) {
          violations.push({
            rule: `${this.rule}.${hook}.commands`,
            tool: this.toolId,
            file: hookPath,
            message: `Hook '${hook}' does not contain required command: ${command}`,
            severity: "error",
          });
        }
      }
    }
    return violations;
  }

  /** Run hooks validation */
  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    // Check husky first - if not installed, can't check hooks
    const huskyViolation = this.checkHuskyInstalled(projectRoot);
    if (huskyViolation) {
      return this.fromViolations([huskyViolation], elapsed());
    }

    const violations = [
      ...this.checkRequiredHooks(projectRoot),
      ...this.checkHookCommands(projectRoot),
    ];

    return this.fromViolations(violations, elapsed());
  }
}

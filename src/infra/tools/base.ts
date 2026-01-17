import { CheckResult, type IToolRunner, type Violation } from "../../types/index.js";

/**
 * Abstract base class for infrastructure tool runners.
 * Provides common functionality for infrastructure validation.
 */
export abstract class BaseInfraToolRunner implements IToolRunner {
  abstract readonly name: string;
  abstract readonly rule: string;
  abstract readonly toolId: string;
  readonly configFiles: string[] = [];

  /**
   * Create a pass result
   */
  protected pass(duration: number): CheckResult {
    return CheckResult.pass(this.name, this.rule, duration);
  }

  /**
   * Create a fail result from violations
   */
  protected fail(violations: Violation[], duration: number): CheckResult {
    return CheckResult.fail(this.name, this.rule, violations, duration);
  }

  /**
   * Create a result from violations (pass if empty, fail otherwise)
   */
  protected fromViolations(violations: Violation[], duration: number): CheckResult {
    return CheckResult.fromViolations(this.name, this.rule, violations, duration);
  }

  /**
   * Create a skip result
   */
  protected skip(reason: string, duration: number): CheckResult {
    return CheckResult.skip(this.name, this.rule, reason, duration);
  }

  /**
   * Run the tool - must be implemented by subclasses
   */
  abstract run(projectRoot: string): Promise<CheckResult>;

  /**
   * Audit the tool - by default same as run for infra tools
   */
  async audit(projectRoot: string): Promise<CheckResult> {
    return this.run(projectRoot);
  }
}

import { glob } from "glob";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseProcessToolRunner } from "./base.js";

/** Forbidden files configuration */
interface ForbiddenFilesConfig {
  enabled?: boolean;
  files?: string[];
  message?: string;
}

/**
 * Runner for forbidden files validation.
 * Validates that certain files do NOT exist anywhere in the repository.
 */
export class ForbiddenFilesRunner extends BaseProcessToolRunner {
  readonly name = "Forbidden Files";
  readonly rule = "process.forbidden_files";
  readonly toolId = "forbidden-files";

  private config: ForbiddenFilesConfig = { enabled: false };

  setConfig(config: ForbiddenFilesConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Run check - scans for forbidden files using glob patterns
   */
  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    const patterns = this.config.files ?? [];
    if (patterns.length === 0) {
      return this.pass(elapsed());
    }

    // Process all patterns in parallel for better performance
    const results = await Promise.all(
      patterns.map(async (pattern) => {
        const foundFiles = await this.findForbiddenFiles(projectRoot, pattern);
        return foundFiles.map((file) => this.createViolation(file, pattern));
      })
    );

    const violations = results.flat();
    return this.fromViolations(violations, elapsed());
  }

  /**
   * Find files matching a forbidden pattern
   */
  private async findForbiddenFiles(projectRoot: string, pattern: string): Promise<string[]> {
    try {
      const matches = await glob(pattern, {
        cwd: projectRoot,
        dot: true,
        nodir: true,
        ignore: ["**/node_modules/**", "**/.git/**"],
      });
      return matches;
    } catch {
      return [];
    }
  }

  /**
   * Create a violation for a forbidden file
   */
  private createViolation(file: string, pattern: string): Violation {
    const customMessage = this.config.message;
    const baseMessage = `Forbidden file exists: ${file} (matched pattern: ${pattern})`;
    const message = customMessage ? `${baseMessage}. ${customMessage}` : baseMessage;

    return {
      rule: `${this.rule}.exists`,
      tool: this.toolId,
      file,
      message,
      severity: "error",
    };
  }
}

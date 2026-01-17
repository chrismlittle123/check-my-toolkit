import * as fs from "node:fs";
import * as path from "node:path";

import { glob } from "glob";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseToolRunner } from "./base.js";

/** Default patterns to detect disable comments */
const DEFAULT_PATTERNS = [
  // ESLint
  "eslint-disable",
  "eslint-disable-line",
  "eslint-disable-next-line",
  // TypeScript
  "@ts-ignore",
  "@ts-expect-error",
  "@ts-nocheck",
  // Python
  "# noqa",
  "# type: ignore",
  "# pylint: disable",
  "# pragma: no cover",
  // Prettier
  "prettier-ignore",
];

/** Default file extensions to scan */
const DEFAULT_EXTENSIONS = ["ts", "tsx", "js", "jsx", "py"];

/** Default directories to exclude */
const DEFAULT_EXCLUDE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/__pycache__/**",
  "**/.venv/**",
  "**/venv/**",
  "**/coverage/**",
];

/** Configuration for disable-comments validation */
interface DisableCommentsConfig {
  enabled?: boolean;
  patterns?: string[];
  extensions?: string[];
  exclude?: string[];
}

/**
 * Disable comments runner for detecting linter/type-checker disable comments
 */
export class DisableCommentsRunner extends BaseToolRunner {
  readonly name = "Disable Comments";
  readonly rule = "code.quality";
  readonly toolId = "disable-comments";
  readonly configFiles: string[] = []; // No config file needed

  private config: DisableCommentsConfig = {};

  /**
   * Set the configuration for this runner
   */
  setConfig(config: DisableCommentsConfig): void {
    this.config = config;
  }

  /**
   * Get the patterns to search for
   */
  private getPatterns(): string[] {
    return this.config.patterns ?? DEFAULT_PATTERNS;
  }

  /**
   * Get the file extensions to scan
   */
  private getExtensions(): string[] {
    return this.config.extensions ?? DEFAULT_EXTENSIONS;
  }

  /**
   * Get the exclude patterns
   */
  private getExcludePatterns(): string[] {
    return [...DEFAULT_EXCLUDE, ...(this.config.exclude ?? [])];
  }

  /**
   * Build glob pattern for file extensions
   */
  private buildGlobPattern(): string {
    const extensions = this.getExtensions();
    if (extensions.length === 1) {
      return `**/*.${extensions[0]}`;
    }
    return `**/*.{${extensions.join(",")}}`;
  }

  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();

    try {
      const pattern = this.buildGlobPattern();
      const ignorePatterns = this.getExcludePatterns();

      const files = await glob(pattern, {
        cwd: projectRoot,
        ignore: ignorePatterns,
        nodir: true,
      });

      if (files.length === 0) {
        return this.pass(Date.now() - startTime);
      }

      const violations = this.scanFiles(projectRoot, files);
      return this.fromViolations(violations, Date.now() - startTime);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return this.fail(
        [this.createErrorViolation(`Disable comments check error: ${message}`)],
        Date.now() - startTime
      );
    }
  }

  /**
   * Scan files for disable comment patterns
   */
  private scanFiles(projectRoot: string, files: string[]): Violation[] {
    const violations: Violation[] = [];
    const patterns = this.getPatterns();

    for (const file of files) {
      const filePath = path.join(projectRoot, file);
      const fileViolations = this.scanFile(file, filePath, patterns);
      violations.push(...fileViolations);
    }

    return violations;
  }

  /**
   * Scan a single file for disable comment patterns
   */
  private scanFile(relativePath: string, absolutePath: string, patterns: string[]): Violation[] {
    const violations: Violation[] = [];

    try {
      const content = fs.readFileSync(absolutePath, "utf-8");
      const lines = content.split("\n");

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineNumber = lineIndex + 1;

        for (const pattern of patterns) {
          if (line.includes(pattern)) {
            violations.push(this.createViolation(relativePath, lineNumber, pattern, line));
            break; // Only report first matching pattern per line
          }
        }
      }
    } catch {
      // Skip files that can't be read (binary, permission issues, etc.)
    }

    return violations;
  }

  /**
   * Create a violation for a found disable comment
   */
  private createViolation(
    file: string,
    line: number,
    pattern: string,
    lineContent: string
  ): Violation {
    // Trim and truncate the line content for the message
    const trimmedContent = lineContent.trim();
    const displayContent =
      trimmedContent.length > 60 ? `${trimmedContent.substring(0, 60)}...` : trimmedContent;

    return {
      rule: `${this.rule}.${this.toolId}`,
      tool: this.toolId,
      file,
      line,
      message: `Found "${pattern}" comment: ${displayContent}`,
      code: pattern,
      severity: "error",
    };
  }

  private createErrorViolation(message: string): Violation {
    return {
      rule: `${this.rule}.${this.toolId}`,
      tool: this.toolId,
      message,
      severity: "error",
    };
  }

  /**
   * Audit - for disable comments, just verify config is valid
   */
  override async audit(_projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();

    // Validate patterns if provided
    const patterns = this.getPatterns();
    if (patterns.length === 0) {
      return this.fail(
        [
          {
            rule: `${this.rule}.${this.toolId}`,
            tool: "audit",
            message: "At least one pattern must be configured",
            severity: "error",
          },
        ],
        Date.now() - startTime
      );
    }

    return this.pass(Date.now() - startTime);
  }
}

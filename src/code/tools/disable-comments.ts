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

/** Quote state for tracking string contexts */
interface QuoteState {
  single: boolean;
  double: boolean;
  template: boolean;
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
    // Deduplicate extensions to avoid glob pattern issues
    const unique = [...new Set(extensions)];
    if (unique.length === 1) {
      return `**/*.${unique[0]}`;
    }
    return `**/*.{${unique.join(",")}}`;
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

  /** File extensions with known comment syntax */
  private static readonly KNOWN_EXTENSIONS = new Set(["py", "ts", "tsx", "js", "jsx"]);

  /** Check if we can toggle a specific quote type */
  private canToggleQuote(
    quoteChar: string,
    char: string,
    state: QuoteState,
    isPython: boolean
  ): boolean {
    if (char !== quoteChar) {
      return false;
    }
    if (quoteChar === "'") {
      return !state.double && !state.template;
    }
    if (quoteChar === '"') {
      return !state.single && !state.template;
    }
    return !isPython && !state.single && !state.double; // backtick
  }

  /** Quote tracking state for string detection */
  private updateQuoteState(char: string, isPython: boolean, state: QuoteState): void {
    if (this.canToggleQuote("'", char, state, isPython)) {
      state.single = !state.single;
    } else if (this.canToggleQuote('"', char, state, isPython)) {
      state.double = !state.double;
    } else if (this.canToggleQuote("`", char, state, isPython)) {
      state.template = !state.template;
    }
  }

  /** Check if character is a comment marker */
  private isCommentMarker(line: string, index: number, isPython: boolean): boolean {
    const char = line[index];
    if (isPython) {
      return char === "#";
    }
    return char === "/" && line[index + 1] === "/";
  }

  /**
   * Find the start of a comment in a line, ignoring comment markers inside strings.
   * Returns the index of the comment start, or -1 if no comment found.
   */
  private findCommentStart(line: string, extension: string): number {
    const isPython = extension === "py";
    const quoteState: QuoteState = { single: false, double: false, template: false };

    for (let i = 0; i < line.length; i++) {
      if (i > 0 && line[i - 1] === "\\") {
        continue;
      } // Skip escaped

      this.updateQuoteState(line[i], isPython, quoteState);

      const inString = quoteState.single || quoteState.double || quoteState.template;
      if (!inString && this.isCommentMarker(line, i, isPython)) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Check if a pattern appears in a comment (not in a string)
   */
  private isPatternInComment(line: string, pattern: string, extension: string): boolean {
    const patternIndex = line.indexOf(pattern);
    if (patternIndex === -1) {
      return false;
    }

    // For unknown file types, fall back to simple string matching
    // This maintains backward compatibility for custom extensions like .md
    if (!DisableCommentsRunner.KNOWN_EXTENSIONS.has(extension)) {
      return true;
    }

    const commentStart = this.findCommentStart(line, extension);

    // Pattern is in a comment if comment starts at or before the pattern
    // Use <= because patterns like "# noqa" include the comment marker
    return commentStart !== -1 && commentStart <= patternIndex;
  }

  /**
   * Scan a single file for disable comment patterns
   */
  private scanFile(relativePath: string, absolutePath: string, patterns: string[]): Violation[] {
    const violations: Violation[] = [];

    try {
      const content = fs.readFileSync(absolutePath, "utf-8");
      const lines = content.split("\n");

      // Get file extension for comment detection
      const extension = path.extname(relativePath).slice(1).toLowerCase();

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineNumber = lineIndex + 1;

        for (const pattern of patterns) {
          // Only flag if pattern appears in an actual comment, not in a string
          if (this.isPatternInComment(line, pattern, extension)) {
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

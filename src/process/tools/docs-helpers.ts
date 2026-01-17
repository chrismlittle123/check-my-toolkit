import matter from "gray-matter";

/** Enforcement mode for documentation checks */
export type EnforcementMode = "block" | "warn";

/** Doc type configuration */
export interface DocTypeConfig {
  required_sections?: string[];
  frontmatter?: string[];
}

/** Documentation configuration from check.toml */
export interface DocsConfig {
  enabled?: boolean;
  path?: string;
  enforcement?: EnforcementMode;
  allowlist?: string[];
  max_files?: number;
  max_file_lines?: number;
  max_total_kb?: number;
  staleness_days?: number;
  stale_mappings?: Record<string, string>;
  require_docs_in_pr?: boolean;
  min_coverage?: number;
  coverage_paths?: string[];
  exclude_patterns?: string[];
  types?: Record<string, DocTypeConfig>;
}

/** Parsed frontmatter from a markdown file */
export interface ParsedDoc {
  filePath: string;
  frontmatter: Record<string, unknown>;
  content: string;
  headings: string[];
}

/** Export info from TypeScript file */
export interface ExportInfo {
  name: string;
  file: string;
  line: number;
}

/** Escape special regex characters in a string */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extract heading text from markdown content */
export function extractHeadings(content: string): string[] {
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  const headings: string[] = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push(match[1].trim());
  }
  return headings;
}

/** Parse named export from a line */
export function parseNamedExport(line: string): string | null {
  const match = /^export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/.exec(line);
  return match ? match[1] : null;
}

/** Parse default export from a line */
export function parseDefaultExport(line: string): string | null {
  const match = /^export\s+default\s+(\w+)/.exec(line);
  if (match && !["function", "class", "async"].includes(match[1])) {
    return match[1];
  }
  return null;
}

/** Parse re-exports from a line */
export function parseReExports(line: string): string[] {
  const match = /^export\s*\{\s*([^}]+)\s*\}/.exec(line);
  if (!match) {
    return [];
  }
  return match[1]
    .split(",")
    .map((n) => {
      const parts = n.trim().split(/\s+as\s+/);
      return parts[parts.length - 1].trim();
    })
    .filter((name) => name && !/^(type|interface)$/.test(name));
}

/** Parse a markdown file and extract frontmatter, content, headings */
export function parseMarkdownFile(content: string, filePath: string): ParsedDoc {
  const { data, content: mdContent } = matter(content);
  return {
    filePath,
    frontmatter: data,
    content: mdContent,
    headings: extractHeadings(mdContent),
  };
}

/** Extract exports from file content */
export function extractFileExports(file: string, content: string): ExportInfo[] {
  const exports: ExportInfo[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];

    const named = parseNamedExport(line);
    if (named) {
      exports.push({ name: named, file, line: lineNumber });
      continue;
    }

    const defaultExp = parseDefaultExport(line);
    if (defaultExp) {
      exports.push({ name: defaultExp, file, line: lineNumber });
      continue;
    }

    const reExports = parseReExports(line);
    for (const name of reExports) {
      exports.push({ name, file, line: lineNumber });
    }
  }

  return exports;
}

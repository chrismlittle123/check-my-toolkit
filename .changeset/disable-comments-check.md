---
"check-my-toolkit": minor
---

feat: add disable-comments check to detect linter disable comments

New check under `[code.quality.disable-comments]` that detects and reports disable comments across multiple linters:

**Default patterns detected:**
- ESLint: `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line`
- TypeScript: `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`
- Python: `# noqa`, `# type: ignore`, `# pylint: disable`, `# pragma: no cover`
- Prettier: `prettier-ignore`

**Configuration options:**
- `patterns` - Override default patterns to detect
- `extensions` - File extensions to scan (default: ts, tsx, js, jsx, py)
- `exclude` - Glob patterns to exclude from scanning

Example usage:
```toml
[code.quality.disable-comments]
enabled = true
exclude = ["tests/**"]
```

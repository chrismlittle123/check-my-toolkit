---
"check-my-toolkit": patch
---

Fix CI self-check failures

- Remove unused MCP handler exports flagged by Knip
- Make internal MCP types private (GitHubSource, LocalSource, ParsedSource)
- Add `gh` CLI to Knip ignoreBinaries
- Exclude cli.ts from disable-comments check (legitimate max-lines disable)

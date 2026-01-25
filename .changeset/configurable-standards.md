---
"check-my-toolkit": minor
---

feat(mcp): Add configurable standards repository and guideline validation

- Add `mcp.standards.source` configuration option supporting GitHub repos and local paths
- Add `cm validate guidelines <path>` CLI command to validate guideline frontmatter
- Add `cm schema guidelines` CLI command to output JSON schema for guidelines
- MCP server now loads config to get the standards source at startup

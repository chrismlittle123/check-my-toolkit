---
"check-my-toolkit": minor
---

feat(mcp): add MCP server for dynamic standards composition

Add an MCP server that allows Claude to fetch and compose coding standards from the `palindrom-ai/standards` repository.

**New Command:**
- `cm mcp` - Start the MCP server for Claude Desktop integration

**Tools Exposed:**
- `get_standards` - Get composed standards matching a context (e.g., "python fastapi postgresql")
- `list_guidelines` - List all available guidelines with optional category filter
- `get_guideline` - Get a single guideline by ID
- `get_ruleset` - Get a tool configuration ruleset by ID

**Features:**
- Smart keyword matching against guideline tags
- Caches standards repository locally for fast access
- Supports authentication via `GITHUB_TOKEN` or `CM_REGISTRY_TOKEN`

Closes #175

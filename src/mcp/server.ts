/**
 * MCP Server for coding standards
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  getGuidelineHandler,
  getGuidelineInputSchema,
  getRulesetHandler,
  getRulesetInputSchema,
  getStandardsHandler,
  getStandardsInputSchema,
  listGuidelinesHandler,
  listGuidelinesInputSchema,
} from "./tools/index.js";

/**
 * Create and configure the MCP server with all tools registered.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "cm-standards",
    version: "1.0.0",
  });

  // Register get_standards tool - smart context matching
  server.registerTool("get_standards", {
    description:
      "Get composed coding standards matching a context string. Use this to fetch relevant guidelines for a specific technology stack or task.",
    inputSchema: getStandardsInputSchema,
  }, getStandardsHandler);

  // Register list_guidelines tool
  server.registerTool("list_guidelines", {
    description: "List all available coding guidelines with optional category filter.",
    inputSchema: listGuidelinesInputSchema,
  }, listGuidelinesHandler);

  // Register get_guideline tool
  server.registerTool("get_guideline", {
    description: "Get a single coding guideline by its ID.",
    inputSchema: getGuidelineInputSchema,
  }, getGuidelineHandler);

  // Register get_ruleset tool
  server.registerTool("get_ruleset", {
    description:
      "Get a tool configuration ruleset by ID (e.g., typescript-production, python-internal).",
    inputSchema: getRulesetInputSchema,
  }, getRulesetHandler);

  return server;
}

/**
 * Start the MCP server with stdio transport.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

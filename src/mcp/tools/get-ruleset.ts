/**
 * MCP tool: get_ruleset
 * Gets a tool configuration ruleset by ID
 */
import { z } from "zod";

import { fetchStandardsRepo, getRulesetsDir, loadRuleset, listRulesets } from "../standards/index.js";

/** Input schema for get_ruleset tool */
export const getRulesetInputSchema = {
  id: z.string().describe('Ruleset ID (e.g., "typescript-production", "python-internal")'),
};

/** Handler for get_ruleset tool */
export async function getRulesetHandler(args: { id: string }): Promise<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}> {
  const repoPath = await fetchStandardsRepo();
  const rulesetsDir = getRulesetsDir(repoPath);
  const ruleset = loadRuleset(rulesetsDir, args.id);

  if (!ruleset) {
    const available = listRulesets(rulesetsDir);
    return {
      content: [
        {
          type: "text",
          text: `Ruleset not found: ${args.id}\n\nAvailable rulesets:\n${available.map((r) => `- ${r}`).join("\n")}`,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `# Ruleset: ${ruleset.id}\n\n\`\`\`toml\n${ruleset.content}\n\`\`\``,
      },
    ],
  };
}

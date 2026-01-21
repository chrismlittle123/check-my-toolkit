/**
 * MCP tool: get_guideline
 * Gets a single coding guideline by ID
 */
import { z } from "zod";

import { fetchStandardsRepo, getGuidelinesDir, loadGuideline } from "../standards/index.js";

/** Input schema for get_guideline tool */
export const getGuidelineInputSchema = {
  id: z.string().describe('Guideline ID (e.g., "auth", "database", "typescript")'),
};

/** Handler for get_guideline tool */
export async function getGuidelineHandler(args: { id: string }): Promise<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}> {
  const repoPath = await fetchStandardsRepo();
  const guidelinesDir = getGuidelinesDir(repoPath);
  const guideline = loadGuideline(guidelinesDir, args.id);

  if (!guideline) {
    return {
      content: [
        {
          type: "text",
          text: `Guideline not found: ${args.id}`,
        },
      ],
      isError: true,
    };
  }

  // Return full markdown content with frontmatter info
  const header = `# ${guideline.title}\n\n**Category:** ${guideline.category} | **Priority:** ${guideline.priority}\n**Tags:** ${guideline.tags.join(", ")}\n\n---\n\n`;

  return {
    content: [
      {
        type: "text",
        text: header + guideline.content,
      },
    ],
  };
}

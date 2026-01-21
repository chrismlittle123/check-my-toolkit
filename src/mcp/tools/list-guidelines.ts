/**
 * MCP tool: list_guidelines
 * Lists all available coding guidelines with optional category filter
 */
import { z } from "zod";

import {
  fetchStandardsRepo,
  getGuidelinesDir,
  loadAllGuidelines,
  toListItems,
} from "../standards/index.js";

/** Input schema for list_guidelines tool */
export const listGuidelinesInputSchema = {
  category: z.string().optional().describe("Optional category filter (e.g., 'security', 'infrastructure')"),
};

/** Handler for list_guidelines tool */
export async function listGuidelinesHandler(args: { category?: string }): Promise<{
  content: { type: "text"; text: string }[];
}> {
  const repoPath = await fetchStandardsRepo();
  const guidelinesDir = getGuidelinesDir(repoPath);
  let guidelines = loadAllGuidelines(guidelinesDir);

  // Filter by category if provided
  if (args.category) {
    const categoryLower = args.category.toLowerCase();
    guidelines = guidelines.filter((g) => g.category.toLowerCase() === categoryLower);
  }

  const items = toListItems(guidelines);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(items, null, 2),
      },
    ],
  };
}

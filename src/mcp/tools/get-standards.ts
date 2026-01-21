/**
 * MCP tool: get_standards
 * Gets composed coding standards matching a context string
 */
import { z } from "zod";

import {
  fetchStandardsRepo,
  getGuidelinesDir,
  loadAllGuidelines,
  matchGuidelines,
  composeGuidelines,
} from "../standards/index.js";

/** Input schema for get_standards tool */
export const getStandardsInputSchema = {
  context: z
    .string()
    .describe(
      'Context string describing the task or technology stack (e.g., "python fastapi llm postgresql")'
    ),
  limit: z.number().optional().describe("Maximum number of guidelines to return (default: 5)"),
};

/** Handler for get_standards tool */
export async function getStandardsHandler(args: { context: string; limit?: number }): Promise<{
  content: { type: "text"; text: string }[];
}> {
  const repoPath = await fetchStandardsRepo();
  const guidelinesDir = getGuidelinesDir(repoPath);
  const guidelines = loadAllGuidelines(guidelinesDir);

  const limit = args.limit ?? 5;
  const matches = matchGuidelines(guidelines, args.context, limit);

  const composed = composeGuidelines(matches);

  // Add summary header
  const summary =
    matches.length > 0
      ? `Found ${matches.length} matching guideline(s) for context: "${args.context}"\n\nMatched guidelines (by relevance):\n${matches.map((m) => `- ${m.guideline.title} (score: ${m.score.toFixed(1)})`).join("\n")}\n\n---\n\n`
      : "";

  return {
    content: [
      {
        type: "text",
        text: summary + composed,
      },
    ],
  };
}

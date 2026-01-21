import { describe, expect, it } from "vitest";

import {
  parseContext,
  scoreGuideline,
  matchGuidelines,
  composeGuidelines,
} from "../../../src/mcp/standards/matcher.js";
import { type Guideline } from "../../../src/mcp/standards/types.js";

describe("matcher", () => {
  describe("parseContext", () => {
    it("extracts keywords from context string", () => {
      const keywords = parseContext("python fastapi postgresql");
      expect(keywords).toEqual(["python", "fastapi", "postgresql"]);
    });

    it("handles various separators", () => {
      const keywords = parseContext("python, fastapi.app/postgresql-db");
      expect(keywords).toContain("python");
      expect(keywords).toContain("fastapi");
      expect(keywords).toContain("postgresql");
    });

    it("lowercases keywords", () => {
      const keywords = parseContext("Python FastAPI");
      expect(keywords).toEqual(["python", "fastapi"]);
    });

    it("removes duplicates", () => {
      const keywords = parseContext("python python python");
      expect(keywords).toEqual(["python"]);
    });

    it("filters short words", () => {
      const keywords = parseContext("a b python c d");
      expect(keywords).toEqual(["python"]);
    });
  });

  describe("scoreGuideline", () => {
    const guideline: Guideline = {
      id: "auth",
      title: "Authentication",
      category: "security",
      priority: 1,
      tags: ["typescript", "python", "auth", "security"],
      content: "content",
    };

    it("counts matching tags", () => {
      const score = scoreGuideline(guideline, ["python", "auth"]);
      // 2 tag matches + 0.5 for id match ("auth" in id)
      expect(score).toBe(2.5);
    });

    it("returns 0 for no matches", () => {
      const score = scoreGuideline(guideline, ["java", "spring"]);
      expect(score).toBe(0);
    });

    it("adds partial score for category/id matches", () => {
      const score = scoreGuideline(guideline, ["security"]);
      // 1 for tag match + 0.5 for category match
      expect(score).toBe(1.5);
    });
  });

  describe("matchGuidelines", () => {
    const guidelines: Guideline[] = [
      {
        id: "auth",
        title: "Authentication",
        category: "security",
        priority: 1,
        tags: ["typescript", "python", "auth"],
        content: "auth content",
      },
      {
        id: "database",
        title: "Database",
        category: "infrastructure",
        priority: 2,
        tags: ["postgresql", "database", "backend"],
        content: "db content",
      },
      {
        id: "frontend",
        title: "Frontend",
        category: "ui",
        priority: 3,
        tags: ["typescript", "react", "frontend"],
        content: "frontend content",
      },
    ];

    it("returns matching guidelines sorted by score", () => {
      const matches = matchGuidelines(guidelines, "typescript auth");

      expect(matches.length).toBeGreaterThan(0);
      // auth should be first (matches typescript + auth = 2 tags)
      expect(matches[0].guideline.id).toBe("auth");
    });

    it("filters out zero-score guidelines", () => {
      const matches = matchGuidelines(guidelines, "java spring");
      expect(matches).toHaveLength(0);
    });

    it("respects limit parameter", () => {
      const matches = matchGuidelines(guidelines, "typescript", 1);
      expect(matches).toHaveLength(1);
    });

    it("returns empty for empty context", () => {
      const matches = matchGuidelines(guidelines, "");
      expect(matches).toHaveLength(0);
    });

    it("sorts by priority when scores are equal", () => {
      // Both auth and frontend match "typescript" with same score
      const matches = matchGuidelines(guidelines, "typescript");

      // Find the typescript-matching guidelines
      const tsMatches = matches.filter(
        (m) => m.guideline.id === "auth" || m.guideline.id === "frontend"
      );

      // Both should have same base score, but auth has priority 1, frontend has priority 3
      // So auth should come first
      if (tsMatches.length >= 2 && tsMatches[0].score === tsMatches[1].score) {
        expect(tsMatches[0].guideline.priority).toBeLessThan(tsMatches[1].guideline.priority);
      }
    });
  });

  describe("composeGuidelines", () => {
    it("composes multiple guidelines into markdown", () => {
      const matches = [
        {
          guideline: {
            id: "auth",
            title: "Authentication",
            category: "security",
            priority: 1,
            tags: ["auth"],
            content: "Auth content here",
          },
          score: 2,
        },
        {
          guideline: {
            id: "db",
            title: "Database",
            category: "infra",
            priority: 2,
            tags: ["db"],
            content: "DB content here",
          },
          score: 1,
        },
      ];

      const composed = composeGuidelines(matches);

      expect(composed).toContain("# Authentication");
      expect(composed).toContain("# Database");
      expect(composed).toContain("Auth content here");
      expect(composed).toContain("DB content here");
      expect(composed).toContain("---");
    });

    it("returns message for no matches", () => {
      const composed = composeGuidelines([]);
      expect(composed).toContain("No matching guidelines found");
    });
  });
});

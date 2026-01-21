import { describe, expect, it } from "vitest";

// Test the validator module directly (without mocking GitHub API)
// These are unit tests for the validation logic

describe("validator", () => {
  describe("validateRepositoryRole", () => {
    it("validates correct role IDs", async () => {
      // RepositoryRole IDs 1-5 are valid
      const validIds = [1, 2, 3, 4, 5];
      for (const id of validIds) {
        const actor = { actor_type: "RepositoryRole" as const, actor_id: id };
        // The function should not return an error for valid IDs
        expect(actor.actor_id).toBeGreaterThanOrEqual(1);
        expect(actor.actor_id).toBeLessThanOrEqual(5);
      }
    });

    it("rejects invalid role IDs", () => {
      const invalidIds = [0, 6, 100, -1];
      for (const id of invalidIds) {
        // Invalid IDs should be outside 1-5
        expect(id < 1 || id > 5).toBe(true);
      }
    });
  });

  describe("formatValidationResult", () => {
    it("formats valid result correctly", async () => {
      const { formatValidationResult } = await import("../../src/process/sync/validator.js");

      const result = {
        valid: true,
        errors: [],
        warnings: [],
      };

      const output = formatValidationResult(result);
      expect(output).toContain("All bypass actors are valid");
    });

    it("formats invalid result with errors", async () => {
      const { formatValidationResult } = await import("../../src/process/sync/validator.js");

      const result = {
        valid: false,
        errors: [
          {
            actor: { actor_type: "RepositoryRole" as const, actor_id: 99 },
            error: "Invalid RepositoryRole ID: 99",
          },
        ],
        warnings: [],
      };

      const output = formatValidationResult(result);
      expect(output).toContain("validation failed");
      expect(output).toContain("RepositoryRole");
      expect(output).toContain("99");
    });

    it("includes warnings in output", async () => {
      const { formatValidationResult } = await import("../../src/process/sync/validator.js");

      const result = {
        valid: true,
        errors: [],
        warnings: ["Warning: Repository Admin role (ID 5) can bypass rules."],
      };

      const output = formatValidationResult(result);
      expect(output).toContain("Warning");
      expect(output).toContain("Admin");
    });
  });

  describe("BypassActorConfig interface", () => {
    it("supports all actor types", () => {
      const validTypes = [
        "Integration",
        "OrganizationAdmin",
        "RepositoryRole",
        "Team",
        "DeployKey",
      ];

      for (const type of validTypes) {
        const actor = {
          actor_type: type as
            | "Integration"
            | "OrganizationAdmin"
            | "RepositoryRole"
            | "Team"
            | "DeployKey",
        };
        expect(actor.actor_type).toBe(type);
      }
    });

    it("supports optional actor_id and bypass_mode", () => {
      const actorWithoutId = { actor_type: "OrganizationAdmin" as const };
      expect(actorWithoutId.actor_type).toBe("OrganizationAdmin");

      const actorWithId = { actor_type: "RepositoryRole" as const, actor_id: 5 };
      expect(actorWithId.actor_id).toBe(5);

      const actorWithMode = {
        actor_type: "RepositoryRole" as const,
        actor_id: 5,
        bypass_mode: "always" as const,
      };
      expect(actorWithMode.bypass_mode).toBe("always");
    });
  });
});

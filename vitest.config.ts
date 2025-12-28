import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Exclude e2e project fixtures from being picked up as real tests
    exclude: ["**/node_modules/**", "**/tests/e2e/projects/**"],
    // Run test files in parallel
    fileParallelism: true,
    // Limit concurrency to avoid resource contention with ESLint/Ruff
    maxConcurrency: 5,
    // Coverage configuration for unit tests
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/index.ts", // Re-export file
      ],
    },
  },
});

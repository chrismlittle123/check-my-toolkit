import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run test files in parallel
    fileParallelism: true,
    // Limit concurrency to avoid resource contention with ESLint/Ruff
    maxConcurrency: 5,
  },
});

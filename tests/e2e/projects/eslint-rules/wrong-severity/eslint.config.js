// ESLint config with wrong severity - check.toml requires "error" but this is "warn"
export default [
  {
    files: ["**/*.ts", "**/*.js"],
    rules: {
      "no-unused-vars": "warn", // Should be "error"
    },
  },
];

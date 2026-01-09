// ESLint config with rules using options matching check.toml requirements
export default [
  {
    files: ["**/*.ts", "**/*.js"],
    rules: {
      "max-depth": ["error", 4],
      "max-params": ["error", 4],
      complexity: ["warn", 10],
    },
  },
];

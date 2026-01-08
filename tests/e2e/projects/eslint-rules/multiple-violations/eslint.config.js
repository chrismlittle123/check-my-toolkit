// ESLint config with multiple violations:
// - no-unused-vars: correct (error)
// - semi: wrong severity (warn instead of error)
// - eqeqeq: missing
// - no-console: missing
export default [
  {
    files: ["**/*.ts", "**/*.js"],
    rules: {
      "no-unused-vars": "error", // Correct
      semi: "warn", // Wrong - should be "error"
      // eqeqeq is missing
      // no-console is missing
    },
  },
];

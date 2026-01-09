// ESLint config with max-depth set to 6 (check.toml expects 4)
export default [
  {
    files: ["**/*.ts", "**/*.js"],
    rules: {
      "max-depth": ["error", 6],
    },
  },
];

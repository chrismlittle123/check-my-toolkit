// ESLint config missing 'eqeqeq' rule required by check.toml
export default [
  {
    files: ["**/*.ts", "**/*.js"],
    rules: {
      "no-unused-vars": "error",
      // eqeqeq is missing!
    },
  },
];

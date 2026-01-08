// ESLint config with rules matching check.toml requirements
export default [
  {
    files: ["**/*.ts", "**/*.js"],
    rules: {
      "no-unused-vars": "error",
      semi: "warn",
    },
  },
];

// Helper function exported from here
export const helper = () => console.log("helper");

// Also export from this file directly (duplicate with index.ts re-export)
export { helper as helperAlias } from "./utils.js";

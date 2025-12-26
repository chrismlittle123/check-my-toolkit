// Main entry point
// Importing a package that's not in package.json
import lodash from "lodash";

export const main = () => {
  console.log(lodash.VERSION);
};
main();

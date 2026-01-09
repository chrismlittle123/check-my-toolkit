---
"check-my-toolkit": minor
---

feat: add 8 high-value ESLint rules for bug prevention

Added eslint-plugin-import and configured 8 high-signal rules that catch real bugs:

**Bug Prevention:**
- `import/no-cycle` - Detect circular dependencies (architecture rot)
- `array-callback-return` - Catch missing returns in .map(), .filter(), etc.
- `no-template-curly-in-string` - Catch wrong quotes on template literals
- `consistent-return` - Ensure consistent function return behavior
- `@typescript-eslint/no-unnecessary-condition` - Catch dead code and logic errors
- `@typescript-eslint/switch-exhaustiveness-check` - Ensure all union cases are handled
- `@typescript-eslint/no-non-null-assertion` - Prevent false confidence from ! assertions

**Code Quality:**
- `max-params` - Force better function design (max 4 parameters)

All rules are now audited via `cm code audit` to ensure eslint.config.js matches requirements.

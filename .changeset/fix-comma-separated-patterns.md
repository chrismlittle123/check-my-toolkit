---
"check-my-toolkit": patch
---

fix: support comma-separated patterns in test file validation

The test file pattern option now correctly handles comma-separated patterns like
`**/*.{test,spec}.ts,**/test_*.py`. The patterns are split at top-level commas
while preserving brace syntax (commas inside braces like `{test,spec}` are kept).

Fixes BUG-001.

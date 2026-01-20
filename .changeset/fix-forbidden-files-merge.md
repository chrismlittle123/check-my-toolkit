---
"check-my-toolkit": patch
---

Fix forbidden_files configuration not being merged with defaults

The `[process.forbidden_files]` feature was completely non-functional because the
`mergeProcess()` function in `config/loader.ts` did not include `forbidden_files`
in its merge logic. The configuration was parsed and validated but never passed
to the runner.

This fix adds `forbidden_files` to the merge process, making the feature work as
intended.

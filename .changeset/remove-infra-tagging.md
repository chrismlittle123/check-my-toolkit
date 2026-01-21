---
"check-my-toolkit": major
---

Remove `[infra.tagging]` feature and INFRA domain commands

BREAKING CHANGE: The `[infra.tagging]` configuration and `cm infra check/audit` commands have been removed. The INFRA domain will be reimplemented as a manifest-based resource existence scanner designed exclusively for drift-toolkit scheduled checks.

If you were using `[infra.tagging]` in your check.toml, remove that section as it is no longer supported.

---
"check-my-toolkit": minor
---

Add test coverage verification feature (`code.coverage_run`)

- Runs actual test suite with coverage during `cm code check`
- Supports vitest, jest, and pytest (auto-detected or configurable)
- Verifies coverage meets a configurable minimum threshold (default 80%)
- Supports custom test commands via `command` option
- Parses coverage reports from common formats (coverage-summary.json, coverage-final.json, pytest-cov)

---
"check-my-toolkit": minor
---

Remove redundant `code.tests` feature and optimize test workflow

**Breaking Change**: The `[code.tests]` configuration is no longer supported. Use `[code.coverage_run]` instead, which actually runs tests and validates coverage thresholds.

**Test workflow improvements**:
- CI now runs unit and e2e tests as separate steps for better visibility
- Pre-push hook no longer runs tests (faster local workflow)
- Default `pnpm test` now runs only unit tests (~43s vs ~7min)

New test scripts:
- `pnpm test` - Unit tests only (fast, for local dev)
- `pnpm test:watch` - Unit tests in watch mode
- `pnpm test:e2e` - E2E tests only
- `pnpm test:all` - All tests

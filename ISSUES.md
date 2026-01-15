# Issues Log

This file tracks issues discovered during development and testing.

**Last Updated:** 2026-01-15

---

## Open Issues

### ISSUE-001: Gitleaks does not detect AWS credentials pattern

**Severity:** Not a Bug (Expected Behavior)
**Status:** Closed - Won't Fix
**Test ID:** GLK-003
**Date Found:** 2026-01-15

**Description:**
Gitleaks does not detect the AWS credentials pattern `AKIAIOSFODNN7EXAMPLE`.

**Resolution:**
This is **expected behavior**. `AKIAIOSFODNN7EXAMPLE` is AWS's official example key used in all their documentation. Gitleaks intentionally allowlists this specific key to avoid false positives.

---

### ISSUE-002: Gitleaks database connection string detection

**Severity:** Low
**Status:** Test Added
**Test ID:** GLK-005
**Date Found:** 2026-01-15

**Description:**
Gitleaks detection of database connection strings with embedded credentials needs testing.

**Resolution:**
Unit test added in `tests/unit/gitleaks.test.ts`. E2E test fixture created in `tests/e2e/projects/gitleaks/with-db-secret/` but commented out due to CI custom config detection issue (#46).

---

### ISSUE-003: Missing `allow_dynamic_routes` Option for Naming Conventions

**Severity:** Medium
**Status:** Open
**Test ID:** NAM-010 to NAM-014
**Date Found:** 2026-01-15

**Description:**
The naming rules should support an `allow_dynamic_routes` option for Next.js/Remix dynamic route folders like `[id]`, `[...slug]`, `[[...slug]]`, `(group)`, and `@slot`.

**Expected Behavior:**
```toml
[[code.naming.rules]]
extensions = ["tsx"]
file_case = "kebab-case"
folder_case = "kebab-case"
allow_dynamic_routes = true
```

**Actual Behavior:**
```
Config error: Invalid check.toml configuration:
  - code.naming.rules.0: Unrecognized key(s) in object: 'allow_dynamic_routes'
```

**Notes:**
The `naming.ts` implementation has logic for dynamic route detection (lines 134-167), but the config schema doesn't expose the `allow_dynamic_routes` option to users.

---

### ISSUE-004: Vulture scanning .venv directory

**Severity:** Medium
**Status:** Open
**Test ID:** ISO-005, ISO-006
**Date Found:** 2026-01-15

**Description:**
Vulture scans the Python virtual environment directory (.venv), resulting in false positives from third-party packages.

**Expected Behavior:**
Vulture should only scan project source files, not virtual environment directories.

**Actual Behavior:**
Vulture reports violations from `.venv/lib/python3.14/site-packages/`

**Possible Solution:**
Add `.venv` to Vulture's exclude paths in check.toml or vulture configuration.

---

### ISSUE-005: Test pattern not matching test files

**Severity:** High
**Status:** Open
**Test ID:** TST-MIX-003, MIX-007
**Date Found:** 2026-01-15

**Description:**
The test file pattern `**/*.{test,spec}.ts,**/test_*.py` is not matching existing test files.

**Actual Behavior:**
```
error [min-test-files] No test files found matching pattern "/*.{test,spec}.ts,/test_*.py".
Expected at least 1.
```

**Possible Solution:**
Adjust the pattern syntax or glob implementation for combined patterns.

---

### ISSUE-006: Symlinks causing parse errors

**Severity:** Medium
**Status:** Open
**Test ID:** EDGE-004
**Date Found:** 2026-01-15

**Description:**
Symlinks with mismatched extensions (e.g., `linked-from-typescript.py` pointing to `original.ts`) cause parse errors in Python tools.

**Actual Behavior:**
- Ruff Format: `Failed to parse test-scenarios/edge-cases/symlinks/linked-from-typescript.py`
- ty: Multiple `invalid-syntax` errors

**Notes:**
This may be expected behavior - symlinks with mismatched extensions are an edge case.

---

### ISSUE-007: Naming rules applying to test-scenarios directory

**Severity:** Low
**Status:** Open
**Test ID:** NAM-MIX-001 to NAM-MIX-004
**Date Found:** 2026-01-15

**Description:**
Naming rules apply to test-scenarios directory structure, flagging kebab-case folders as violations.

**Possible Solution:**
Add test-scenarios to naming exclusion list.

---

### ISSUE-008: CI test failure - repo-codeowners-fail

**Severity:** Medium
**Status:** Open
**Test ID:** E2E repo-codeowners-fail
**Date Found:** 2026-01-15

**Description:**
The `process/repo-codeowners-fail` e2e test passes locally but fails in CI.

**Expected Behavior:**
Test should fail with exit code 1 when CODEOWNERS is missing.

**Actual Behavior in CI:**
```
✓ Repository: skipped - Could not determine GitHub repository from git remote
```
Test exits with code 0 (skip) instead of code 1 (fail).

**Root Cause:**
The test fixture doesn't have a valid git remote configured, so the repo check skips entirely in CI.

**Possible Solution:**
Either mock the git remote in the test fixture, or change the test expectation to handle the skip case.

---

## Test Implementation Issues

These are issues with the test suite, not bugs in check-my-toolkit:

### TEST-ISSUE-001: ESLint Tests Use Invalid Flat Config

**Affected Tests:** ESL-001, ESL-006, ESL-012

**Problem:** Tests create ESLint flat configs without `"type": "module"` in package.json or `files` pattern in eslint.config.js (required for ESLint 9+).

---

### TEST-ISSUE-002: "Not Installed" Tests Are Invalid

**Affected Tests:** ESL-013, PRT-005, TSC-010

**Problem:** Tests expect cm to report "not installed" when a tool isn't in package.json. However, cm uses npx which auto-downloads tools.

---

### TEST-ISSUE-003: TypeScript Tests Don't Actually Run tsc

**Affected Tests:** TSC-002, TSC-003

**Problem:** Test fixtures don't have TypeScript installed (no `npm install`).

---

### TEST-ISSUE-004: createTsConfig Helper Has Wrong Defaults

**Affected Tests:** TSC-006

**Problem:** The createTsConfig helper always includes `strict: true` as a default, interfering with "missing option" tests.

---

### TEST-ISSUE-005: Gitleaks Tests May Use Non-Matching Patterns

**Affected Tests:** GLK-003, GLK-005

**Problem:** Some test patterns don't match gitleaks' built-in rules.

---

### TEST-ISSUE-006: Naming Tests Missing Required Properties

**Affected Tests:** NAM-003, NAM-004, NAM-005, NAM-008, NAM-009

**Problem:** Schema requires `extensions`, `file_case`, AND `folder_case` for each naming rule.

---

## Resolved Issues

### ISSUE-RESOLVED-001: yaml dependency error in v0.28.0

**Severity:** Critical
**Status:** Fixed in v0.28.1
**Date Found:** 2026-01-15
**Date Resolved:** 2026-01-15

**Description:**
v0.28.0 was published with incorrect imports - `import yaml from "yaml"` instead of `import * as yaml from "js-yaml"`.

**Resolution:**
Fix was already in main (commit 233b7fc). Patch release v0.28.1 published with changeset.

---

## Issue Statistics

| Severity | Open | Resolved | Won't Fix |
|----------|------|----------|-----------|
| Critical | 0    | 1        | 0         |
| High     | 1    | 0        | 0         |
| Medium   | 4    | 0        | 0         |
| Low      | 2    | 0        | 1         |
| **Total**| **7**| **1**    | **1**     |

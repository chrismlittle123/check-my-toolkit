# Bugs

Confirmed bugs that need fixing in check-my-toolkit.

**Last Updated:** 2026-01-15

---

## Open Bugs

### BUG-001: Test file pattern does not support comma-separated patterns

**Severity:** High
**Status:** Open
**Date Found:** 2026-01-15
**Source:** ISSUE-005 in ISSUES.md

**Description:**
The test file validation feature (`code.quality.tests`) does not support comma-separated glob patterns. When users specify a pattern like `**/*.{test,spec}.ts,**/test_*.py`, it fails to match any files.

**Steps to Reproduce:**
1. Add to check.toml:
   ```toml
   [code.quality.tests]
   enabled = true
   pattern = "**/*.{test,spec}.ts,**/test_*.py"
   min_test_files = 1
   ```
2. Run `cm code check`
3. Observe error: `No test files found matching pattern`

**Expected Behavior:**
The pattern should match both:
- `tests/ts/index.test.ts`
- `tests/py/test_main.py`

**Actual Behavior:**
```
error [min-test-files] No test files found matching pattern "**/*.{test,spec}.ts,**/test_*.py".
```

**Root Cause:**
The glob library accepts either:
1. A single pattern string with proper glob syntax: `**/*.{test,spec}.ts`
2. An array of patterns: `["**/*.test.ts", "**/test_*.py"]`

But NOT comma-separated patterns in a single string. The comma is not treated as an OR operator at the top level.

**Relevant Code:**
- `src/code/tools/tests.ts:52-62` - Pattern is passed as single string to glob

**Proposed Fix:**
Either:
1. Support array patterns in config schema: `pattern = ["**/*.test.ts", "**/test_*.py"]`
2. Auto-split comma-separated patterns before passing to glob
3. Provide better error message explaining valid pattern syntax

---

## Enhancement Requests (Not Bugs)

### ENHANCEMENT-001: Add exclude option to Vulture configuration

**Severity:** Medium
**Status:** Enhancement Request
**Date Found:** 2026-01-15
**Source:** ISSUE-004 in ISSUES.md

**Description:**
Vulture scans the entire project directory including `.venv`, `node_modules`, and other directories that should typically be excluded. The current implementation doesn't expose an `exclude` option in check.toml.

**Current Behavior:**
Vulture runs with `vulture .` and no exclusion arguments, causing false positives from virtual environment packages.

**Requested Behavior:**
Add `exclude` option to Vulture config:
```toml
[code.deadcode.vulture]
enabled = true
exclude = [".venv", "node_modules", "dist"]
```

**Workaround:**
Users can create a `.vultureignore` file or configure exclusions in `pyproject.toml` under `[tool.vulture]`.

**Relevant Code:**
- `src/config/schema.ts:132-138` - Vulture schema only has `enabled`
- `src/code/tools/vulture.ts:42-47` - No exclude args passed

---

## Resolved Bugs

### BUG-RESOLVED-001: yaml dependency error in v0.28.0

**Severity:** Critical
**Status:** Fixed in v0.28.1
**Date Found:** 2026-01-15
**Date Fixed:** 2026-01-15

**Description:**
v0.28.0 was published with incorrect imports - `import yaml from "yaml"` instead of `import * as yaml from "js-yaml"` in process tools.

**Resolution:**
Fix was already in main (commit 233b7fc). Patch release v0.28.1 published with changeset.

---

## Bug Statistics

| Severity | Open | Fixed |
|----------|------|-------|
| Critical | 0    | 1     |
| High     | 1    | 0     |
| Medium   | 0    | 0     |
| Low      | 0    | 0     |
| **Total**| **1**| **1** |

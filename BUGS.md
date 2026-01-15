# Bugs

Confirmed bugs that need fixing in check-my-toolkit.

**Last Updated:** 2026-01-15

---

## Open Bugs

*No open bugs at this time.*

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

### BUG-RESOLVED-002: Test file pattern does not support comma-separated patterns

**Severity:** High
**Status:** Fixed in v0.28.2
**Date Found:** 2026-01-15
**Date Fixed:** 2026-01-15
**Source:** ISSUE-005 in ISSUES.md

**Description:**
The test file validation feature (`code.quality.tests`) did not support comma-separated glob patterns. When users specified a pattern like `**/*.{test,spec}.ts,**/test_*.py`, it failed to match any files.

**Root Cause:**
The glob library accepts either a single pattern string or an array of patterns, but the code passed comma-separated patterns as a single string. Commas inside braces (like `{test,spec}`) are valid glob syntax, but top-level commas were incorrectly treated as part of the pattern.

**Resolution:**
Added a `splitPatterns()` helper function that splits pattern strings on top-level commas while preserving brace syntax. The split patterns are then passed as an array to glob.

**Relevant Code:**
- `src/code/tools/tests.ts:17-43` - New `splitPatterns()` function

---

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
| High     | 0    | 1     |
| Medium   | 0    | 0     |
| Low      | 0    | 0     |
| **Total**| **0**| **2** |

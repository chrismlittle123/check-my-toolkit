---
"check-my-toolkit": minor
---

Add `cm process scan --repo` command for remote repository validation

- New command to scan GitHub repository settings via API without cloning
- Validates branch protection rulesets, tag protection, and required files
- Supports `--repo owner/repo` format and JSON output
- Exports `validateProcess()` programmatic API for drift-toolkit integration

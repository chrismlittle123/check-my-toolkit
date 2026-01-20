---
"check-my-toolkit": patch
---

Fix tier validation bugs and improve error messages

- #147: Export VALID_TIERS constant for use by other packages
- #151: Fix repo-metadata.yaml lookup to use git root instead of config directory
- #156: Show warning when repo-metadata.yaml has YAML parse errors
- #158: Distinguish between missing, empty, and invalid repo-metadata.yaml files
- #159: Warn when extends.registry is configured but rulesets is empty
- #161: Show valid tier options when an invalid tier value is used
- #162: Add glob pattern validation for forbidden_files configuration

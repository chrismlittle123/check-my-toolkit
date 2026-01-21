---
"check-my-toolkit": minor
---

feat(gitleaks): add scan mode options for secrets detection

Add configurable scan modes for Gitleaks secret detection:
- `scan_mode`: Choose scanning scope - `branch` (default), `files`, `staged`, or `full`
- `base_branch`: Set base branch for branch mode comparison (default: `main`)

Default behavior changed from scanning entire git history to scanning only current branch commits since diverging from the base branch. This provides faster scans and more relevant results for feature branch workflows.

Closes #198

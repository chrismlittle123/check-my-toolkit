---
"check-my-toolkit": minor
---

Add process.ci validation for GitHub Actions workflows

- Check that required workflow files exist in `.github/workflows/`
- Validate required jobs exist in workflow YAML files
- Validate required actions are used in workflow steps
- New configuration options: `require_workflows`, `jobs`, `actions`

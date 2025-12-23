---
"check-my-toolkit": patch
---

Add CI/CD workflows and improve documentation

- Add GitHub Actions CI workflow for testing across Node 18, 20, 22
- Add release workflow with changesets for automated npm publishing
- Add PR checks workflow for branch naming and changelog reminders
- Add pull request template
- Add CHANGELOG.md following Keep a Changelog format
- Improve README.md with installation, usage, and configuration docs
- Add missing npm scripts: typecheck, test:e2e, version
- Add @changesets/cli dependency

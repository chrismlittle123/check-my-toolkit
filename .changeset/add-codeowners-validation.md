---
"check-my-toolkit": minor
---

Add CODEOWNERS validation with registry inheritance

- New `[process.codeowners]` config section for defining required CODEOWNERS rules
- Validates CODEOWNERS file contains all configured rules with exact owner match
- Fails if CODEOWNERS has rules not defined in config
- Rules from registry and project config are merged (project can override same pattern)
- Supports standard CODEOWNERS locations: `.github/CODEOWNERS`, `CODEOWNERS`, `docs/CODEOWNERS`

---
"check-my-toolkit": patch
---

Fix validation and tool detection bugs

- Add strict mode to all Zod schemas to reject unknown configuration keys
- Add --format option validation with choices (text, json)
- Fix ruff/vulture binary detection when not installed (now correctly reports "skipped")
- Add Brewfile for development dependencies (Python 3.13, ruff, vulture)

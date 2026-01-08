---
"check-my-toolkit": patch
---

Bug fixes:

- **pip-audit**: Now uses `-r requirements.txt` to audit project dependencies instead of the current environment
- **Registry timeout**: Git clone now has a 30-second timeout to prevent hanging on network issues
- **README**: Fixed incorrect config format in documentation examples

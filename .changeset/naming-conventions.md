---
"check-my-toolkit": minor
---

Add naming conventions validation for file and folder names.

Features:
- Support for kebab-case, snake_case, camelCase, PascalCase
- Configure rules per file extension (e.g., .ts, .py, .tsx)
- Validates both file names and containing folder names
- Skips special files like __init__.py and _internal.py

Example configuration:
```toml
[code.naming]
enabled = true

[[code.naming.rules]]
extensions = ["ts", "tsx"]
file_case = "kebab-case"
folder_case = "kebab-case"

[[code.naming.rules]]
extensions = ["py"]
file_case = "snake_case"
folder_case = "snake_case"
```

---
"check-my-toolkit": patch
---

Fix multiple reported bugs:

- Fix VERSION constant mismatch (was showing 0.2.0 instead of 0.7.2)
- Detect and report broken symlinks for check.toml instead of silently ignoring
- Handle tsc not installed error with clean message instead of garbled ANSI output
- Fix gitleaks audit to fail on non-install errors instead of returning pass
- Show just filename when line/column are undefined instead of misleading :0:0
- Improve pip-audit to detect actual dependency file instead of always reporting requirements.txt

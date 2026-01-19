---
"check-my-toolkit": patch
---

Fix 12 bugs across CODE and PROCESS domains

CODE domain fixes:
- Add duplicate extension validation in schema (#127)
- Handle undefined exitCode in coverage-run (#125)
- Add vulture exclusion patterns for virtual environments (#123)
- Deduplicate extensions in glob patterns (#122)
- Add symlink detection in ruff and ty tools (#124)
- Add comment-aware pattern detection to avoid false positives (#128)

PROCESS domain fixes:
- Use non-greedy scope regex in commits (#116)
- Add word boundary to issue reference regex (#115)
- Split frontmatter delimiter error messages (#120)
- Report malformed CODEOWNERS lines as violations (#114)
- Report YAML parse errors in CI checks (#107)
- Generate dynamic branch examples from config (#121)

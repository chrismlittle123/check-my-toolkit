---
"check-my-toolkit": major
---

feat: implement process.docs documentation governance

Adds documentation governance feature to the PROCESS domain with:
- Structure enforcement (allowlist, max_files, max_file_lines, max_total_kb)
- Content validation (frontmatter, required sections, internal links)
- Freshness tracking (git-based staleness detection)
- API coverage (regex-based export detection with threshold)

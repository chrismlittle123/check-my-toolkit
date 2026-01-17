---
"check-my-toolkit": minor
---

Replace npmaudit with pnpmaudit and add exclude_dev option

- Remove npm audit support, keep only pnpm audit
- Add `exclude_dev` config option (default: true) to skip dev dependencies
- Uses `--prod` flag when exclude_dev is enabled

---
"check-my-toolkit": minor
---

Remove --monorepo flag in favor of pnpm -r exec

The `--monorepo` flag has been removed. For monorepo support, use pnpm's built-in workspace commands instead:

```bash
# Run checks in all packages
pnpm -r exec cm code check

# Run checks in specific packages  
pnpm --filter "packages/*" exec cm code check
```

This approach is simpler, more reliable, and properly respects each package's check.toml configuration.

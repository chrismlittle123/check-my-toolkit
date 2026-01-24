---
"check-my-toolkit": patch
---

Fix monorepo and infra config being dropped during extends resolution

The `mergeConfigs` function was not preserving `monorepo` and `infra` sections when merging registry config with local config during `extends` resolution. This caused monorepo exclude patterns to be silently dropped.

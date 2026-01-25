---
"check-my-toolkit": minor
---

Add Zod schemas for infrastructure manifest validation

- Added comprehensive Zod schemas in `src/infra/schemas.ts` for runtime validation
- Types are now derived from Zod schemas for consistency
- Export validation functions and schemas from public API:
  - `validateArn`, `validateGcpResourcePath`, `validateAccountKey`
  - `validateManifest`, `validateMultiAccountManifest`, `validateLegacyManifest`
  - `isValidArnFormat`, `isValidGcpResourcePath`, `isValidAccountKey`
  - All `*Schema` exports for external validation

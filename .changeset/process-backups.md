---
"check-my-toolkit": minor
---

Add `[process.backups]` for S3 backup verification

- Verify backups exist at configured S3 location
- Check most recent backup is within `max_age_hours` threshold
- Configuration: `bucket`, `prefix`, `max_age_hours`, `region`
- Uses AWS SDK v3 with `@aws-sdk/client-s3`
- Unit tests with `aws-sdk-client-mock`

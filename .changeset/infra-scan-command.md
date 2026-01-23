---
"check-my-toolkit": minor
---

Add `cm infra scan` command for AWS resource existence verification

- Supports manifest files (JSON or TXT format) containing AWS ARNs
- Verifies resources exist across 8 AWS services: S3, Lambda, DynamoDB, SQS, SNS, Secrets Manager, CloudWatch, IAM
- Outputs results in text or JSON format
- Integrates with drift-toolkit for infrastructure drift detection

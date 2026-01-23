---
"check-my-toolkit": minor
---

feat(infra): add GCP support to cm infra scan

Adds support for checking GCP resources in infrastructure manifests:
- Cloud Run services
- Service Accounts (IAM)
- Secret Manager secrets
- Artifact Registry repositories

GCP resource paths follow the pattern: `projects/{project}/locations/{location}/services/{service}`

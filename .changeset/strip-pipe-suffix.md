---
"check-my-toolkit": patch
---

Strip Pulumi internal pipe suffixes from ARNs during manifest generation

Pulumi sometimes appends internal metadata to ARNs like `|terraform-...` which are not valid AWS ARN formats. These suffixes are now automatically stripped when generating the infra manifest.

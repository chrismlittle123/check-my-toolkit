# INFRA Domain Roadmap

Resource tagging enforcement for AWS.

## Overview

The INFRA domain validates that AWS resources are properly tagged. Tags are critical for cost allocation, ownership tracking, and compliance.

```toml
[infra]
└── [infra.tagging]     # AWS resource tag verification
```

---

## Tagging Enforcement: `[infra.tagging]`

Verify all AWS resources have required tags with valid values.

### Configuration

```toml
[infra.tagging]
enabled = true
region = "us-east-1"  # or from AWS_REGION env

# Required tags on all resources
required = ["Environment", "Owner", "CostCenter"]

# Allowed values for specific tags
[infra.tagging.values]
Environment = ["dev", "stag", "prod"]
```

### Checks

| Check | Description |
|-------|-------------|
| Required tags | All resources have required tags |
| Tag values | Tags match allowed values (if specified) |

### Output

```
[infra.tagging]
  Scanned 47 resources in us-east-1

  ✗ Missing required tags:
    → arn:aws:s3:::my-bucket missing: Owner, CostCenter
    → arn:aws:ec2:us-east-1:123:instance/i-abc123 missing: Environment

  ✗ Invalid tag values:
    → arn:aws:rds:us-east-1:123:cluster:my-db
      Environment: "production" (allowed: dev, stag, prod)

  Tag coverage: 89% (42/47 fully tagged)

infra: 3 violation(s) found
```

### Implementation

Uses AWS Resource Groups Tagging API:

```typescript
import { ResourceGroupsTaggingAPIClient, GetResourcesCommand } from "@aws-sdk/client-resource-groups-tagging-api";

const client = new ResourceGroupsTaggingAPIClient({ region });
const response = await client.send(new GetResourcesCommand({}));
```

### AWS Permissions Required

```json
{
  "Effect": "Allow",
  "Action": ["tag:GetResources"],
  "Resource": "*"
}
```

### Testing

- **Unit tests**: `@aws-sdk/client-mock` to mock AWS SDK responses
- **E2E tests**: LocalStack (Docker) with real AWS API calls

```typescript
// Unit test example
import { mockClient } from "@aws-sdk/client-mock";
import { ResourceGroupsTaggingAPIClient, GetResourcesCommand } from "@aws-sdk/client-resource-groups-tagging-api";

const mock = mockClient(ResourceGroupsTaggingAPIClient);
mock.on(GetResourcesCommand).resolves({
  ResourceTagMappingList: [
    { ResourceARN: "arn:aws:s3:::my-bucket", Tags: [{ Key: "Environment", Value: "prod" }] }
  ]
});
```

```yaml
# docker-compose.yml for E2E tests
services:
  localstack:
    image: localstack/localstack
    ports:
      - "4566:4566"
    environment:
      - SERVICES=s3,resourcegroupstaggingapi
```

---

## CLI Commands

```bash
# Run tagging checks
cm infra check

# Audit - verify tagging config exists
cm infra audit
```

---

## Future Considerations

| Feature | Description |
|---------|-------------|
| Resource type filtering | Only check specific resource types |
| Tag key patterns | Validate tag keys match patterns |
| Multi-region | Scan multiple regions |

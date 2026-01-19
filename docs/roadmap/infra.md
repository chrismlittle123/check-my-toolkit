# INFRA Domain Roadmap

AWS infrastructure validation for CDK-based projects.

## Overview

The INFRA domain validates that AWS infrastructure matches what's declared in CDK code. It detects missing resources, orphaned resources, and attribute drift. This enables drift-toolkit to perform scheduled infrastructure scans.

```toml
[infra]
├── validate    # Compare CDK code vs AWS state
├── generate    # Generate resource declarations from CDK
├── stacks      # List deployed CloudFormation stacks
└── resources   # Query AWS resources
```

---

## `cm infra validate` Command

**Purpose:** Validates that AWS infrastructure matches what's declared in CDK code. Detects missing resources, orphaned resources, and attribute drift.

**Priority:** High (enables `drift infra scan`)

### CLI Interface

```bash
# Validate infra for current project (default: dev account)
cm infra validate

# Validate specific account
cm infra validate --account prod

# Validate all accounts
cm infra validate --account all

# JSON output for programmatic use
cm infra validate --json

# Specify region
cm infra validate --region us-east-1
```

### Output Format

**Human-readable:**

```
Infra Validation Results
========================

Account: prod (333333333333)
Region: us-east-1

✓ 12 resources found
✗ 1 resource missing
! 2 orphaned resources
~ 1 resource drifted

Issues:
-------

MISSING: arn:aws:s3:::my-app-data-bucket
  Source: infra/lib/storage-stack.ts
  Construct: DataBucket
  Stack: MyAppStack

ORPHANED: arn:aws:lambda:us-east-1:333333333333:function:old-handler
  Not declared in CDK code
  Last modified: 2024-01-15

DRIFTED: arn:aws:s3:::my-app-logs
  Attribute: PublicAccessBlockConfiguration.BlockPublicAcls
  Expected: true
  Actual: false
```

**JSON output (`--json`):**

```json
{
  "valid": false,
  "account": "prod",
  "accountId": "333333333333",
  "region": "us-east-1",
  "timestamp": "2024-01-15T10:30:00Z",
  "summary": {
    "found": 12,
    "missing": 1,
    "orphaned": 2,
    "drifted": 1
  },
  "issues": [
    {
      "type": "missing",
      "arn": "arn:aws:s3:::my-app-data-bucket",
      "source": "infra/lib/storage-stack.ts",
      "construct": "DataBucket",
      "stack": "MyAppStack"
    },
    {
      "type": "orphaned",
      "arn": "arn:aws:lambda:us-east-1:333333333333:function:old-handler",
      "lastModified": "2024-01-15T08:00:00Z"
    },
    {
      "type": "drifted",
      "arn": "arn:aws:s3:::my-app-logs",
      "attribute": "PublicAccessBlockConfiguration.BlockPublicAcls",
      "expected": true,
      "actual": false
    }
  ]
}
```

### Validation Types

| Type     | Description                                         |
| -------- | --------------------------------------------------- |
| Missing  | Resources declared in CDK but not found in AWS      |
| Orphaned | Resources in AWS not declared in CDK                |
| Drifted  | Resources exist but attributes don't match expected |

### Workflow

1. Read `[infra]` config from check.toml
2. Run `cdk synth` in the specified path to generate CloudFormation templates
3. Parse templates to extract expected resources
4. Query AWS APIs for actual resource state
5. Compare expected vs actual
6. Report discrepancies

---

## `cm infra generate` Command

**Purpose:** Generates resource declarations from CDK code by parsing `cdk synth` output.

### CLI Interface

```bash
# Auto-discover and output to stdout
cm infra generate

# Append to check.toml
cm infra generate --output check.toml --append

# Specify CDK app path
cm infra generate --path ./infra

# Output format
cm infra generate --format toml
cm infra generate --format json
cm infra generate --format yaml
```

### Workflow

1. Run `cdk synth` to generate CloudFormation templates
2. Parse `cdk.out/*.template.json` files
3. Extract resource logical IDs and types
4. Map constructs back to source TypeScript files using CDK metadata
5. Output resource declarations

---

## `cm infra stacks` Command

**Purpose:** Lists deployed CloudFormation stacks and their resources.

### CLI Interface

```bash
# List stacks in default account
cm infra stacks

# List stacks in prod
cm infra stacks --account prod

# Filter by name pattern
cm infra stacks --filter "MyApp*"

# JSON output
cm infra stacks --json
```

---

## `cm infra resources` Command

**Purpose:** Queries AWS for resources matching criteria.

### CLI Interface

```bash
# Query by resource type
cm infra resources --type AWS::S3::Bucket

# Query by tag
cm infra resources --tag Project=my-app

# Show orphaned resources (not in any stack)
cm infra resources --orphaned

# JSON output
cm infra resources --json
```

---

## check.toml Configuration

### Basic Configuration

```toml
[infra]
enabled = true
path = "./infra"                      # Path to CDK app
stacks = ["MyAppStack", "DataStack"]  # Stacks to validate
```

### Account Configuration

```toml
[infra.accounts]
dev = "111111111111"
staging = "222222222222"
prod = "333333333333"

# Or with profiles/roles
[infra.accounts.dev]
account_id = "111111111111"
profile = "dev-profile"

[infra.accounts.prod]
account_id = "333333333333"
role_arn = "arn:aws:iam::333333333333:role/InfraValidator"
```

### Tracked Attributes

Security-critical attributes monitored for drift:

```toml
[infra.tracked_attributes]
s3 = ["PublicAccessBlockConfiguration", "BucketPolicy", "Versioning"]
lambda = ["Runtime", "Timeout", "VpcConfig"]
iam = ["PolicyDocument", "AssumeRolePolicyDocument"]
```

### Default Tracked Attributes

| Service        | Attributes                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| S3             | PublicAccessBlockConfiguration, BucketPolicy, Versioning, LifecycleConfiguration |
| Lambda         | Runtime, Timeout, MemorySize, VpcConfig, Environment                             |
| API Gateway    | EndpointConfiguration, Policy                                                    |
| IAM Role       | AssumeRolePolicyDocument, AttachedPolicies                                       |
| IAM Policy     | PolicyDocument                                                                   |
| RDS            | PubliclyAccessible, StorageEncrypted, MultiAZ                                    |
| Security Group | IpPermissions, IpPermissionsEgress                                               |
| DynamoDB       | BillingMode, ProvisionedThroughput                                               |

### Explicit Resource Declarations

Optional: explicitly declare resources if auto-discovery isn't sufficient.

```toml
[[infra.resources.items]]
source = "infra/lib/api-stack.ts"
construct = "ApiGateway"
arn_pattern = "arn:aws:apigateway:${region}::restapis/${resourceId}"

[[infra.resources.items]]
source = "infra/lib/storage-stack.ts"
construct = "DataBucket"
arn_pattern = "arn:aws:s3:::${bucketName}"
```

---

## AWS Authentication

Uses standard AWS credential chain:

- Environment variables (`AWS_ACCESS_KEY_ID`, etc.)
- AWS profiles (`~/.aws/credentials`)
- IAM roles (for CI/CD)

**Multi-account access:**

```bash
# Using profiles
AWS_PROFILE=prod cm infra validate --account prod
```

---

## Programmatic API

```typescript
import { validateInfra } from "check-my-toolkit";

const result = await validateInfra({
  projectPath: ".",
  account: "prod", // or "all"
  region: "us-east-1",
});

// result.valid: boolean
// result.issues: InfraIssue[]
// result.summary: { found, missing, orphaned, drifted }
```

---

## Dependencies

Optional peer dependencies (lazy-loaded when infra commands are used):

- `@aws-sdk/client-cloudformation`
- `@aws-sdk/client-s3`
- `@aws-sdk/client-lambda`
- `@aws-sdk/client-iam`
- `@aws-sdk/client-rds`
- `@aws-sdk/client-ec2`
- `@aws-sdk/client-dynamodb`
- `@aws-sdk/client-apigateway`
- `@aws-sdk/client-resource-groups-tagging-api`
- `aws-cdk-lib` (for synth parsing)

---

## Integration with drift-toolkit

drift-toolkit calls check-my-toolkit programmatically for infra scanning:

```typescript
import { validateInfra } from "check-my-toolkit";

const result = await validateInfra({
  configPath: "./check.toml",
  account: "prod",
});

if (!result.valid) {
  // Create GitHub issue with result.issues
}
```

**drift-toolkit `infra scan` workflow:**

1. Discover repos with `[infra]` in check.toml
2. Call `cm infra validate --account all --json`
3. Parse results
4. Create GitHub issue if violations found

---

## Implementation Priority

| Phase | Feature                    | Enables            |
| ----- | -------------------------- | ------------------ |
| 3     | Infra schema in check.toml | `drift infra scan` |
| 3     | `cm infra validate`        | `drift infra scan` |
| 3     | `cm infra generate`        | Resource discovery |
| 3     | `cm infra stacks`          | Stack exploration  |
| 3     | `cm infra resources`       | Resource queries   |

---

## Implementation Status

| Feature                      | Status     |
| ---------------------------- | ---------- |
| `[infra]` schema             | 📋 Planned |
| `[infra.accounts]` schema    | 📋 Planned |
| `[infra.tracked_attributes]` | 📋 Planned |
| `[infra.resources]` schema   | 📋 Planned |
| `cm infra validate`          | 📋 Planned |
| `cm infra generate`          | 📋 Planned |
| `cm infra stacks`            | 📋 Planned |
| `cm infra resources`         | 📋 Planned |

---

## Open Questions

1. **CDK synth requirement** - Should we require `cdk synth` or also support pre-generated templates?
2. **Cross-stack references** - How to handle resources that reference other stacks?
3. **Dynamic resources** - How to handle resources created by custom resources or macros?
4. **Remediation suggestions** - Should we suggest specific fix commands?
5. **Baseline snapshots** - Should we support "accept current state as baseline" for gradual adoption?

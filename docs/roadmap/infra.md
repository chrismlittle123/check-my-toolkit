# INFRA Domain Roadmap

Infrastructure as Code validation and live infrastructure verification.

## Overview

The INFRA domain validates infrastructure configuration through two complementary approaches:

1. **Static Analysis** - Lint and scan IaC files (Terraform, CDK, CloudFormation)
2. **Live Verification** - Call cloud APIs to verify deployed resources match policies

```toml
[infra]
├── [infra.terraform]     # Terraform linting and validation
├── [infra.cdk]           # AWS CDK checks
├── [infra.cloudformation]# CloudFormation template validation
├── [infra.tagging]       # Resource tagging enforcement (live)
├── [infra.drift]         # Drift detection (live)
├── [infra.cost]          # Cost monitoring and guardrails (live)
└── [infra.compliance]    # Security/compliance verification (live)
```

**Key distinction:**
- Static checks run against files (like CODE domain)
- Live checks require cloud credentials and make API calls

---

## Trigger Cadence

| Check Type | Trigger | Requires |
|------------|---------|----------|
| Static (terraform fmt, tflint) | Push, PR | Files only |
| Live (tagging, drift, cost) | Schedule, Manual | Cloud credentials |

```yaml
# Static checks on PR
on: [pull_request]
jobs:
  infra-lint:
    steps:
      - run: npx cm infra check --static

# Live checks on schedule
on:
  schedule:
    - cron: '0 6 * * *'  # 6am daily
jobs:
  infra-verify:
    steps:
      - run: npx cm infra check --live
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## v1.0 — Static IaC Analysis (No Cloud Credentials)

### Terraform: `[infra.terraform]`

**Complexity: Low-Medium** — Wraps existing tools.

| Check | Description | Tool |
|-------|-------------|------|
| Format | Files are formatted | `terraform fmt -check` |
| Validate | Configuration is valid | `terraform validate` |
| Lint | Best practices | `tflint` |
| Security | Misconfigurations | `tfsec` or `checkov` |

```toml
[infra.terraform]
enabled = true
require_fmt = true
require_validate = true

[infra.terraform.tflint]
enabled = true
config = ".tflint.hcl"  # Optional custom config

[infra.terraform.security]
enabled = true
tool = "tfsec"  # or "checkov"
severity = "high"  # Fail on high+ severity
```

**Implementation:**
1. Find `.tf` files in project
2. Run `terraform fmt -check -recursive`
3. Run `terraform validate` (requires `terraform init`)
4. Run `tflint` with optional config
5. Run security scanner

**Output:**
```
[infra.terraform]
  ✓ terraform fmt (all files formatted)
  ✓ terraform validate (configuration valid)
  ✗ tflint: 2 warnings
    → aws_instance.main: instance type t2.micro is previous generation
    → aws_s3_bucket.logs: missing lifecycle rule
  ✗ tfsec: 1 high severity issue
    → aws_s3_bucket.data: bucket does not have encryption enabled

infra: 3 violation(s) found
```

---

### CDK: `[infra.cdk]`

**Complexity: Low-Medium** — Wraps CDK CLI.

| Check | Description | Tool |
|-------|-------------|------|
| Synth | CDK synthesizes successfully | `cdk synth` |
| Diff | Show what would change | `cdk diff` |
| Security | Scan synthesized templates | `checkov` on `cdk.out/` |

```toml
[infra.cdk]
enabled = true
require_synth = true
language = "typescript"  # or "python", "java", etc.

[infra.cdk.security]
enabled = true
scan_output = true  # Scan cdk.out/ with checkov
```

**Implementation:**
1. Run `cdk synth` to generate CloudFormation templates
2. Optionally run `cdk diff` to show changes
3. Scan `cdk.out/*.template.json` with security tools

---

### CloudFormation: `[infra.cloudformation]`

**Complexity: Low** — Template validation.

| Check | Description | Tool |
|-------|-------------|------|
| Validate | Template syntax valid | `aws cloudformation validate-template` |
| Lint | Best practices | `cfn-lint` |
| Security | Misconfigurations | `checkov` |

```toml
[infra.cloudformation]
enabled = true
templates = ["infra/**/*.yaml", "infra/**/*.json"]

[infra.cloudformation.cfn_lint]
enabled = true

[infra.cloudformation.security]
enabled = true
tool = "checkov"
```

---

## v1.1 — Tagging Enforcement (Live)

### Resource Tagging: `[infra.tagging]`

**Complexity: Medium** — Requires AWS API calls.

| Check | Description | Data Source |
|-------|-------------|-------------|
| Required tags | All resources have required tags | AWS Resource Groups Tagging API |
| Tag values | Tags match allowed patterns | AWS Resource Groups Tagging API |
| Coverage | Percentage of resources tagged | AWS Resource Groups Tagging API |

```toml
[infra.tagging]
enabled = true
provider = "aws"
region = "us-east-1"  # or from AWS_REGION env

# Required tags on all resources
required = ["Environment", "Owner", "CostCenter", "Project"]

# Tag value patterns (regex)
[infra.tagging.patterns]
Environment = "^(dev|staging|prod)$"
CostCenter = "^CC-[0-9]{4}$"
Owner = "^[a-z]+@company\\.com$"

# Resource type specific requirements
[infra.tagging.resources.aws_s3_bucket]
required = ["DataClassification"]  # Additional tag for S3

[infra.tagging.resources.aws_rds_cluster]
required = ["BackupPolicy"]  # Additional tag for RDS
```

**Implementation:**
1. Use AWS Resource Groups Tagging API (`resourcegroupstaggingapi`)
2. Call `GetResources` to list all tagged resources
3. Check each resource against required tags
4. Validate tag values against patterns
5. Report missing/invalid tags

**AWS Permissions Required:**
```json
{
  "Effect": "Allow",
  "Action": [
    "tag:GetResources",
    "tag:GetTagKeys",
    "tag:GetTagValues"
  ],
  "Resource": "*"
}
```

**Output:**
```
[infra.tagging]
  Scanned 47 resources in us-east-1

  ✗ Missing required tags:
    → arn:aws:s3:::my-bucket missing: Owner, CostCenter
    → arn:aws:ec2:us-east-1:123:instance/i-abc123 missing: Environment

  ✗ Invalid tag values:
    → arn:aws:rds:us-east-1:123:cluster:my-db
      Environment: "production" should match ^(dev|staging|prod)$

  Tag coverage: 89% (42/47 fully tagged)

infra: 3 violation(s) found
```

---

## v1.2 — Drift Detection (Live)

### Terraform Drift: `[infra.drift]`

**Complexity: Medium-High** — Requires Terraform state access + cloud credentials.

| Check | Description | Data Source |
|-------|-------------|-------------|
| State drift | Resources differ from state | `terraform plan` |
| Refresh | State matches reality | `terraform refresh` |

```toml
[infra.drift]
enabled = true
provider = "terraform"

# Terraform configuration
[infra.drift.terraform]
working_dir = "infra/"
workspace = "prod"  # Optional workspace

# What to do on drift detection
[infra.drift.policy]
fail_on_drift = true
ignore_attributes = ["tags.LastModified"]  # Ignore certain attributes
```

**Implementation:**
1. Run `terraform plan -detailed-exitcode`
2. Exit code 2 = drift detected
3. Parse plan output to identify drifted resources
4. Report changes

**Output:**
```
[infra.drift]
  Workspace: prod
  State: s3://my-bucket/terraform.tfstate

  ✗ Drift detected in 2 resources:

    aws_security_group.main:
      ~ ingress.0.cidr_blocks: ["10.0.0.0/8"] → ["0.0.0.0/0"]
        (Manual change detected - security risk!)

    aws_instance.web:
      ~ instance_type: "t3.medium" → "t3.large"
        (Scaled up outside Terraform)

infra: 2 drift violation(s) found
```

---

## v1.3 — Cost Monitoring (Live)

### Cost Guardrails: `[infra.cost]`

**Complexity: Medium** — Requires AWS Cost Explorer API.

| Check | Description | Data Source |
|-------|-------------|-------------|
| Budget threshold | Spend vs budget | AWS Budgets API |
| Cost anomalies | Unusual spending | AWS Cost Anomaly Detection |
| Expensive resources | High-cost resources | AWS Cost Explorer |

```toml
[infra.cost]
enabled = true
provider = "aws"

# Budget checks
[infra.cost.budget]
name = "Monthly-Prod"  # AWS Budget name
warn_at = 80  # Warn at 80% of budget
fail_at = 100  # Fail at 100% of budget

# Anomaly detection
[infra.cost.anomalies]
enabled = true
threshold = "medium"  # low, medium, high

# Resource cost warnings
[infra.cost.resources]
warn_daily_cost = 100  # Warn if any resource costs > $100/day
expensive_types = [
  "aws_nat_gateway",
  "aws_elasticsearch_domain",
  "aws_redshift_cluster"
]
```

**AWS Permissions Required:**
```json
{
  "Effect": "Allow",
  "Action": [
    "budgets:ViewBudget",
    "ce:GetCostAndUsage",
    "ce:GetAnomalies"
  ],
  "Resource": "*"
}
```

**Output:**
```
[infra.cost]
  Budget "Monthly-Prod": $8,500 / $10,000 (85%)
  ⚠ Warning: Budget at 85% with 10 days remaining

  Anomalies detected:
  ✗ EC2 spend increased 340% vs last week
    → Investigate: 5 new c5.4xlarge instances launched

  Expensive resources (>$100/day):
  ⚠ arn:aws:rds:us-east-1:123:cluster:analytics - $156/day
  ⚠ arn:aws:nat-gateway:us-east-1:123:nat-abc - $108/day

infra: 1 violation(s), 3 warning(s)
```

---

## v1.4 — Compliance Verification (Live)

### Security Compliance: `[infra.compliance]`

**Complexity: High** — Multiple AWS API calls, complex rules.

| Check | Description | Data Source |
|-------|-------------|-------------|
| S3 encryption | Buckets encrypted | S3 API |
| Public access | No unintended public resources | Various APIs |
| IAM policies | No overly permissive policies | IAM API |
| Security groups | No 0.0.0.0/0 ingress | EC2 API |

```toml
[infra.compliance]
enabled = true
provider = "aws"

# Built-in rule sets
rulesets = ["cis-aws-foundations", "aws-well-architected"]

# Custom rules
[infra.compliance.rules.s3_encryption]
enabled = true
description = "All S3 buckets must have encryption enabled"
severity = "high"

[infra.compliance.rules.no_public_s3]
enabled = true
description = "No S3 buckets with public access"
severity = "critical"

[infra.compliance.rules.no_open_security_groups]
enabled = true
description = "No security groups with 0.0.0.0/0 ingress"
severity = "high"
exceptions = ["sg-abc123"]  # Known public-facing SG
```

**Implementation Options:**
1. **AWS Config Rules** - Query existing AWS Config rule compliance
2. **AWS Security Hub** - Pull findings from Security Hub
3. **Custom API calls** - Direct API calls to verify resources

**Output:**
```
[infra.compliance]
  Ruleset: cis-aws-foundations
  Resources scanned: 156

  ✗ CRITICAL: s3_public_access
    → arn:aws:s3:::public-data-bucket has public ACL

  ✗ HIGH: s3_encryption
    → arn:aws:s3:::legacy-logs not encrypted

  ✗ HIGH: open_security_group
    → sg-xyz789 allows 0.0.0.0/0 on port 22

  Compliance score: 94% (147/156 rules passing)

infra: 3 violation(s) found
```

---

## v2.0 — Multi-Cloud Support

Extend to support GCP and Azure:

```toml
[infra.tagging]
enabled = true
provider = "gcp"  # or "azure"
project = "my-gcp-project"

[infra.tagging]
enabled = true
provider = "azure"
subscription = "my-subscription-id"
```

---

## Implementation Priority

| Priority | Feature | Complexity | Requirements |
|----------|---------|------------|--------------|
| 1 | `[infra.terraform]` | Low | Terraform CLI |
| 2 | `[infra.cdk]` | Low | CDK CLI |
| 3 | `[infra.cloudformation]` | Low | cfn-lint |
| 4 | `[infra.tagging]` | Medium | AWS credentials |
| 5 | `[infra.drift]` | Medium-High | Terraform + AWS |
| 6 | `[infra.cost]` | Medium | AWS credentials |
| 7 | `[infra.compliance]` | High | AWS credentials |

**Recommended starting point:** Static analysis first (terraform, cdk, cloudformation), then tagging enforcement as the first "live" check.

---

## Authentication

For live checks, credentials can be provided via:

1. **Environment variables** (CI/CD)
   ```bash
   AWS_ACCESS_KEY_ID=xxx
   AWS_SECRET_ACCESS_KEY=xxx
   AWS_REGION=us-east-1
   ```

2. **AWS profiles** (local development)
   ```toml
   [infra]
   aws_profile = "prod-readonly"
   ```

3. **IAM roles** (recommended for CI/CD)
   ```yaml
   # GitHub Actions OIDC
   - uses: aws-actions/configure-aws-credentials@v4
     with:
       role-to-assume: arn:aws:iam::123:role/cm-infra-check
   ```

---

## CLI Commands

```bash
# Run all enabled infra checks
cm infra check

# Static analysis only (no cloud credentials needed)
cm infra check --static

# Live verification only (requires credentials)
cm infra check --live

# Specific checks
cm infra check --only tagging
cm infra check --only drift

# Audit - verify infra tooling is configured
cm infra audit
```

---

## Integration with Existing Tools

Rather than reinventing, integrate with:

| Tool | Purpose | Integration |
|------|---------|-------------|
| Terraform | IaC | Wrap CLI commands |
| tflint | Terraform linting | Wrap CLI |
| tfsec | Terraform security | Wrap CLI |
| Checkov | Multi-IaC security | Wrap CLI |
| Infracost | Cost estimation | Wrap CLI for PR cost diffs |
| AWS Config | Compliance rules | Query API |
| AWS Security Hub | Security findings | Query API |

The value of `cm infra check` is **unified configuration and reporting**, not replacing these tools.

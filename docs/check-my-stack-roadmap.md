# check-my-stack Roadmap

Part of the unified `check-my-toolkit` CLI (`cm stack <action>`).

---

## Purpose

Local environment and infrastructure validation. Ensures developers have the right tools, versions, and services running. Validates architecture documentation (ADRs, RFCs) and infrastructure-as-code.

---

## v0.1 — MVP

**Goal:** Verify Node.js version matches `check.toml` config.

### Checks

| Check | Description | Data Source |
|-------|-------------|-------------|
| Node version | Installed version matches required | Local system |

### Config

```toml
[stack.node]
version = "20"
```

### CLI

```bash
cm stack check              # Run all stack checks
cm stack check --format json  # JSON output
cm stack check --ci          # CI mode
```

### Output

**Text:**
```
cm stack check v0.1.0

  [PASS] stack.node.version: v20.10.0 (required: 20)

Result: 1 passed, 0 failed
```

**JSON:**
```json
{
  "domain": "stack",
  "passed": 1,
  "failed": 0,
  "results": [
    {
      "rule": "stack.node.version",
      "status": "pass",
      "message": "v20.10.0 (required: 20)",
      "expected": "20",
      "actual": "20.10.0"
    }
  ]
}
```

---

## v0.2 — Tool Version Checks

| Check | Description | Data Source |
|-------|-------------|-------------|
| npm/pnpm/yarn | Package manager version | Local system |
| Docker | Docker version + running | Local system |
| Git | Git version | Local system |

```toml
[stack.node]
version = "20"

[stack.npm]
version = "10"

[stack.docker]
required = true
version = "24"

[stack.git]
version = "2.40"
```

---

## v0.3 — Stack Fix

`cm stack fix` installs missing tools via mise/brew:

```bash
cm stack diff   # Preview what would be installed
cm stack fix    # Install missing tools
```

```toml
[stack.tools]
installer = "mise"  # or "brew", "manual"
```

---

## v0.4 — Services Check

| Check | Description | Data Source |
|-------|-------------|-------------|
| Docker containers | Required containers running | Docker API |
| Ports | Required ports available | Local system |
| Databases | Connection check | Connection test |

```toml
[stack.services]
docker_compose = true
required_containers = ["postgres", "redis"]

[stack.ports]
required = [3000, 5432, 6379]
```

---

## v0.5 — Environment Variables

| Check | Description | Data Source |
|-------|-------------|-------------|
| Required env vars | Variables exist | Environment |
| .env file | File exists with required keys | Local filesystem |

```toml
[stack.env]
required = ["DATABASE_URL", "API_KEY"]
env_file = ".env"
```

---

## v0.6 — Architecture Documentation

| Check | Description | Data Source |
|-------|-------------|-------------|
| ADRs | Required ADRs exist, follow template | Local filesystem |
| RFCs | Required for major changes | Local filesystem |
| Service READMEs | Required sections present | Local filesystem |
| Runbooks | Required for production services | Local filesystem |

```toml
[stack.docs]
adr_directory = "docs/adr"
adr_template = "docs/adr/template.md"
require_service_readme = true
readme_required_sections = ["Overview", "Setup", "API", "Deployment"]
```

---

## Future

| Check | Description | Tool/API |
|-------|-------------|----------|
| IaC compliance | CDK/Terraform best practices | checkov, tflint, cdk-nag |
| Container security | Image scanning | Trivy |
| System map | Registry of services | Custom |
| Dependency graphs | Cross-service deps | Custom |
| Database schemas | Migration hygiene | Custom |
| Observability | Required metrics/logs | Custom |
| Cost tagging | Required tags | Cloud APIs |

---

## Tech Stack

| Component | Choice |
|-----------|--------|
| Language | TypeScript |
| CLI | Commander.js (shared) |
| Config | check.toml via @iarna/toml + Zod |
| Version detection | node --version, docker --version, etc. |
| Tool installation | mise, brew |
| Output | chalk (text), JSON |

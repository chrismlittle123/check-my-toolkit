# Further Ideas

Unimplemented features and enhancements for check-my-toolkit.

---

## STACK Domain (Environment Validation)

A third domain for validating local development environment setup.

### Concept

```toml
[stack]
├── [stack.tools]     # Required CLI tools and versions
├── [stack.services]  # Required services (Docker, databases)
└── [stack.env]       # Environment variables
```

### Proposed Features

| Feature | Description |
|---------|-------------|
| Tool versions | Verify Node, Python, etc. are installed at correct versions |
| Services | Check Docker, databases, etc. are running |
| Environment variables | Verify required env vars are set |
| Auto-fix | Install missing tools via mise/brew, start services |

### Commands

```bash
cm stack check     # Verify versions, tools, services, env vars
cm stack fix       # Install missing tools, start services
cm stack audit     # Full environment health report
cm stack diff      # Show what fix would install/change
```

### Example Configuration

```toml
[stack.tools]
node = ">=20.0.0"
pnpm = ">=9.0.0"
python = ">=3.11"
docker = true

[stack.services]
docker = { running = true }
postgres = { port = 5432 }

[stack.env]
required = ["DATABASE_URL", "API_KEY"]
```

---

## Other Ideas

*Add new ideas here as they arise.*

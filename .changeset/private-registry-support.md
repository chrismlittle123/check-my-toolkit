---
"check-my-toolkit": minor
---

Add private registry support for configuration inheritance. You can now use private GitHub repositories as config registries:

- **Token authentication**: Set `GITHUB_TOKEN` or `CM_REGISTRY_TOKEN` environment variable, or use `github+token:owner/repo` URL
- **SSH authentication**: Use `github+ssh:owner/repo` URL or auto-detect via SSH agent (`SSH_AUTH_SOCK`)
- **Auto-detection**: When using `github:owner/repo`, authentication method is automatically detected based on available credentials

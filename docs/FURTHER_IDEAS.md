# Further Ideas

Unimplemented features and enhancements for check-my-toolkit.

## Config

1. **Private Registry Support** - Add support for inheriting configuration from private GitHub repositories. Currently `extends` only works reliably with public repos. Need to support:
   - Authentication via `GITHUB_TOKEN` or personal access token
   - SSH URL format (`git@github.com:owner/repo.git`)
   - Configurable auth method (token vs SSH vs system credentials)

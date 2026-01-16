# Further Ideas

Unimplemented features and enhancements for check-my-toolkit.

## CODE Domain

### 1. Test Location Validation (Per-Package)

- Enforce that each package has tests in the correct location (e.g., `tests/` folder)
- For monorepos: validate each package individually has tests in its own `tests/` directory
- For single repos: validate tests exist in the configured location
- Configurable required test directory pattern per package
- Report which packages are missing tests or have tests in wrong locations

## PROCESS Domain

### 2. Protected Branch Push Prevention Hook

- Verify that a pre-push hook exists which prevents direct pushes to protected branches (e.g., main)
- Hook should check the current branch and block pushes to main/master with a helpful error message
- Example hook content to enforce:
  ```bash
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [ "$BRANCH" = "main" ]; then
    echo "ERROR: Direct pushes to main are not allowed."
    echo "Please create a feature branch and open a PR."
    exit 1
  fi
  ```
- Configurable list of protected branch names to check for
- Works for both single repos and monorepos

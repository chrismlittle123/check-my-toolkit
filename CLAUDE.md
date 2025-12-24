# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

check-my-toolkit is a unified CLI tool (`cm`) for project health checks. It currently focuses on the CODE domain (linting and type checking) with planned expansion to PROCESS (workflow enforcement) and STACK (environment validation) domains.

## Common Commands

```bash
# Development
npm run build          # Compile TypeScript to dist/
npm run dev            # Watch mode compilation
npm run typecheck      # Type check without emitting
npm run lint           # Run ESLint on src/
npm run lint:fix       # Auto-fix lint issues

# Testing
npm test               # Run vitest in watch mode
npm run test:coverage  # Run tests with coverage

# CLI (after build)
node dist/cli.js code check      # Run linting and type checking
node dist/cli.js code audit      # Verify tool configs exist
node dist/cli.js validate        # Validate check.toml
```

## Architecture

```
src/
├── cli.ts              # Entry point, Commander.js setup
├── index.ts            # Library exports
├── code/               # CODE domain implementation
│   ├── index.ts        # Domain runner
│   ├── tools/          # Tool implementations (ESLint, Ruff, tsc)
│   └── ...
├── config/             # Configuration loading and validation
│   ├── loader.ts       # Find and load check.toml
│   └── schema.ts       # Zod schemas
├── output/             # Output formatters (text, JSON)
└── types/              # Shared TypeScript types
```

## Configuration

The tool is configured via `check.toml` at the project root:

```toml
[code.linting.eslint]
enabled = true

[code.linting.ruff]
enabled = false

[code.types.tsc]
enabled = true
```

## Key Patterns

- **Tool abstraction**: Each linting/type-checking tool extends a base class in `src/code/tools/`
- **Exit codes**: 0=success, 1=violations found, 2=config error, 3=runtime error
- **Output formats**: Text (default) and JSON (`--format json`)

## Development Workflow

**IMPORTANT: Always use Pull Requests for changes. Never push directly to main.**

### Creating a Feature/Fix

1. **Create a branch** following the naming convention:
   ```
   (feature|fix|hotfix|docs)/vX.Y.Z/description
   ```
   Examples:
   - `feature/v0.2.0/add-knip-integration`
   - `fix/v0.1.3/eslint-parsing-error`
   - `docs/v0.1.3/update-readme`

2. **Make your changes** on the branch

3. **Create a changeset** (required for any code changes):
   ```bash
   # Creates .changeset/<random-name>.md
   npx changeset
   # Or manually create the file
   ```

4. **Create a Pull Request** to merge into main

5. **After PR is merged**, the Release workflow automatically:
   - Bumps version based on changesets
   - Publishes to npm
   - Creates GitHub release with tag

### Branch Naming Convention

Format: `(feature|fix|hotfix|docs)/vX.Y.Z/description`

| Prefix | Use For |
|--------|---------|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `hotfix/` | Critical production fixes |
| `docs/` | Documentation only |

The version should be the target version this change will be included in.

## Release Process

Uses changesets for versioning and automated npm publishing.

### Creating a New Version/Patch

1. **Create a changeset** describing your changes:
   ```bash
   # Option 1: Interactive mode
   npx changeset

   # Option 2: Manually create .changeset/<unique-name>.md with:
   # ---
   # "check-my-toolkit": patch  # or minor, or major
   # ---
   # Description of changes
   ```

2. **Update CHANGELOG.md** with your changes under `[Unreleased]`:
   ```markdown
   ## [Unreleased]

   ### Added
   - Your new feature

   ### Fixed
   - Bug you fixed
   ```

3. **Update version in src/cli.ts** (the VERSION constant)

4. **Commit and push** your changes:
   ```bash
   git add .
   git commit -m "feat: your change description"
   git push
   ```

5. **Create a PR** and merge to main

6. **Automated release**: When merged to main, the release workflow:
   - Runs `npx changeset version` to bump package.json version
   - Creates a "Version Packages" PR
   - When that PR is merged, publishes to npm with OIDC provenance

### Version Types

- **patch** (0.0.X): Bug fixes, documentation, minor improvements
- **minor** (0.X.0): New features, backwards-compatible changes
- **major** (X.0.0): Breaking changes

### Common Mistake: Forgetting Changesets

**If npm publish doesn't trigger after merging to main, you probably forgot to create a changeset.**

How changesets work:
1. You create a `.changeset/*.md` file describing your change
2. The Release workflow runs `npx changeset publish`
3. If there are pending changesets → version bump + npm publish
4. If there are NO changesets → nothing happens (no publish)

**Always create a changeset for code changes before or with your PR.**

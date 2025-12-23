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

## Branch Naming Convention

Branches must follow: `(feature|fix|hotfix|docs)/vX.Y.Z/description`

Examples:
- `feature/v0.2.0/add-process-domain`
- `fix/v0.1.1/eslint-parsing-error`

## Release Process

Uses changesets for versioning. To add a change:

```bash
npx changeset           # Create a changeset
git add .changeset/     # Commit the changeset
```

Merging to main triggers automatic version bumps and npm publishing.

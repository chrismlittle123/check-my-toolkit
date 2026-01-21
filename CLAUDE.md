# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

check-my-toolkit is a unified CLI tool (`cm`) for project health checks. It implements two domains:

- **CODE** - 12 tools for linting, type checking, security, and code quality
- **PROCESS** - 13 workflow checks for git hooks, CI, PRs, branches, commits, documentation, and repository settings

## Prerequisites

Install system dependencies (macOS):

```bash
brew bundle
```

This installs Python 3.13, Ruff, Vulture, and pnpm which are required for running tests.

## Common Commands

```bash
# Development
pnpm run build          # Compile TypeScript to dist/
pnpm run dev            # Watch mode compilation

# Testing
pnpm test               # Run vitest in watch mode
pnpm run test:coverage  # Run tests with coverage

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
├── code/               # CODE domain (12 tools)
│   ├── index.ts        # Domain runner
│   └── tools/          # Tool implementations (ESLint, Ruff, tsc, etc.)
├── process/            # PROCESS domain (13 checks)
│   ├── index.ts        # Domain runner
│   ├── tools/          # Check implementations (hooks, ci, branches, etc.)
│   └── commands/       # Hook commands (check-branch, check-commit)
├── config/             # Configuration loading and validation
│   ├── loader.ts       # Find and load check.toml
│   ├── schema.ts       # Zod schemas
│   └── registry.ts     # Registry resolution
├── projects/           # Project detection for monorepos
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
   (feature|fix|hotfix|docs)/<issue-number>/description
   ```

   Examples:
   - `feature/123/add-knip-integration`
   - `fix/456/eslint-parsing-error`
   - `docs/42/update-readme`

2. **Make your changes** on the branch

3. **Create a changeset** (required for any code changes):

   ```bash
   # Creates .changeset/<random-name>.md
   pnpm exec changeset
   # Or manually create the file
   ```

4. **Create a Pull Request** to merge into main

5. **After PR is merged**, the Release workflow automatically:
   - Bumps version based on changesets
   - Publishes to npm
   - Creates GitHub release with tag

### Branch Naming Convention

Format: `<type>/<issue-number>/<description>`

| Prefix     | Use For                   |
| ---------- | ------------------------- |
| `feature/` | New functionality         |
| `fix/`     | Bug fixes                 |
| `hotfix/`  | Critical production fixes |
| `docs/`    | Documentation only        |

The issue number links the branch to a GitHub issue for tracking.

## Release Process

Uses changesets for versioning and automated npm publishing.

### Creating a New Version/Patch

1. **Create a changeset** describing your changes:

   ```bash
   # Option 1: Interactive mode
   pnpm exec changeset

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
   - Runs `pnpm exec changeset version` to bump package.json version
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
2. The Release workflow runs `pnpm exec changeset publish`
3. If there are pending changesets → version bump + npm publish
4. If there are NO changesets → nothing happens (no publish)

**Always create a changeset for code changes before or with your PR.**

## GitHub Issues and Epics

Task tracking is managed via GitHub Issues and Projects. Spec documents in `docs/specs/` define the design contracts; GitHub Issues track implementation work.

### Checking Existing Epics

**IMPORTANT: Always check for existing epics before creating new issues.**

```bash
# List all epics (issues with 'epic' label)
gh issue list --label epic

# List epics for a specific domain
gh issue list --label epic --label "domain:code"
gh issue list --label epic --label "domain:process"

# View epic details including linked issues
gh issue view <epic-number>

# Search epics by title
gh issue list --label epic --search "dependencies"
```

### Creating Epics

Epics are parent issues that group related work. Format:

```bash
# Create an epic
gh issue create \
  --title "Epic: <Domain> - <Feature Name>" \
  --label epic \
  --label "domain:<code|process>" \
  --body "$(cat <<'EOF'
## Overview
Brief description of what this epic covers.

## Sub-issues
- [ ] #XX - First task
- [ ] #XX - Second task

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] docs/FEATURES.md updated with new functionality

## Related
- Spec: docs/specs/<domain>.md
EOF
)"
```

Example:

```bash
gh issue create \
  --title "Epic: CODE - Dependency Tracking" \
  --label epic \
  --label "domain:code" \
  --body "$(cat <<'EOF'
## Overview
Implement `cm dependencies` command for drift-toolkit integration.

## Sub-issues
- [ ] Add dependencies schema to check.toml
- [ ] Implement built-in dependency mappings
- [ ] Add --json output format
- [ ] Add --check filter option

## Acceptance Criteria
- [ ] `cm dependencies` returns all tracked files
- [ ] `cm dependencies --json` outputs valid JSON
- [ ] Built-in mappings for eslint, prettier, typescript, vitest, pytest
- [ ] docs/FEATURES.md updated with new functionality

## Related
- Spec: docs/specs/code.md
EOF
)"
```

### Creating Sub-issues Linked to Epics

```bash
# Create a sub-issue and link to epic
gh issue create \
  --title "<descriptive title>" \
  --label "domain:<code|process>" \
  --body "$(cat <<'EOF'
## Description
What this issue accomplishes.

## Parent Epic
Part of #<epic-number>

## Tasks
- [ ] Task 1
- [ ] Task 2

## Definition of Done
- [ ] Code implemented
- [ ] Tests passing
- [ ] docs/FEATURES.md updated (if adding user-facing functionality)
EOF
)"

# After creating, update the epic to include the new issue
gh issue edit <epic-number> --body "$(gh issue view <epic-number> --json body -q .body | sed 's/- \[ \] #XX/- [ ] #<new-issue-number>/')"
```

### Adding Issues to Project Board

```bash
# List available projects
gh project list

# Add issue to project (get project number from list above)
gh project item-add <project-number> --owner chrismlittle123 --url https://github.com/chrismlittle123/check-my-toolkit/issues/<issue-number>

# Or add by issue number
gh issue edit <issue-number> --add-project "check-my-toolkit"
```

### Labels

| Label            | Purpose                    |
| ---------------- | -------------------------- |
| `epic`           | Parent issue grouping work |
| `domain:code`    | CODE domain work           |
| `domain:process` | PROCESS domain work        |
| `bug`            | Bug fix                    |
| `enhancement`    | New feature or improvement |
| `documentation`  | Documentation only         |

### Workflow Rules

1. **Before creating any issue**, check if an epic already exists for that feature area
2. **New features** should be sub-issues of an existing epic, or create a new epic first
3. **Bug fixes** can be standalone issues (don't need an epic)
4. **Link sub-issues** to their parent epic in the issue body
5. **Update epic checklists** when sub-issues are completed
6. **Close epics** when all sub-issues are done

## Release Planning with Milestones

### How Milestones and Changesets Work Together

| Tool           | Purpose                       | When Used                 |
| -------------- | ----------------------------- | ------------------------- |
| **Milestones** | Plan what goes into a release | Before/during development |
| **Changesets** | Determine version number      | When PR is ready          |

**Milestones** = your _intent_ ("I want these features in v1.2.0")
**Changesets** = the _mechanism_ (calculates actual version from bump types)

### Creating a Milestone

```bash
# Create milestone for next release
gh api repos/chrismlittle123/check-my-toolkit/milestones \
  --method POST \
  -f title="v1.2.0" \
  -f description="Description of release goals"

# List existing milestones
gh api repos/chrismlittle123/check-my-toolkit/milestones
```

### Assigning Issues to Milestones

```bash
# Assign issue to milestone (use milestone number, not title)
gh issue edit 123 --milestone "v1.2.0"

# View issues in a milestone
gh issue list --milestone "v1.2.0"
```

### Release Workflow

```
1. Create milestone "v1.2.0" for planned release
2. Create issues for planned work
3. Assign issues to milestone
4. Create branches: feature/123/description (issue number required)
5. Add changeset to PR: pnpm changeset (pick patch/minor/major)
6. PR must include "Closes #123" in description
7. Merge PRs to main
8. Release workflow runs → version calculated from changesets
9. Close milestone when release ships
```

## Branch and PR Requirements

### Branch Naming (Enforced by pre-push hook)

Format: `<type>/<issue-number>/<description>`

```
feature/123/add-dark-mode    ✓
fix/456/broken-button        ✓
hotfix/789/security-patch    ✓
docs/42/update-readme        ✓

feature/add-dark-mode        ✗ (missing issue number)
123/add-dark-mode            ✗ (missing type)
```

Excluded: `main`, `docs/*`

### PR Requirements (Enforced by GitHub Actions)

1. **Issue link required**: PR description must contain `Closes #123`, `Fixes #123`, or `Resolves #123`
2. **Changeset required**: For code changes, run `pnpm changeset` and commit the file
3. **Milestone recommended**: Assign PR to target release milestone

## Release Process (Claude Instructions)

When asked to "release", "publish", or "create a release", ALWAYS follow this process:

1. **Create Issue** - Document the changes being released
2. **Create Branch** - Use format: `<type>/<milestone>/<issue-number>/<description>`
3. **Commit Changes** - Include `Closes #<issue>` in message
4. **Add Changeset** - Run `pnpm changeset` or create `.changeset/*.md` manually
5. **Push & Create PR** - Push branch and create PR linking the issue
6. **Merge PR** - Use squash merge
7. **Wait for CI** - Changesets workflow creates release commit and tag
8. **Verify Release** - Check GitHub releases and npm

**NEVER:**

- Commit directly to main
- Create tags manually before the changeset workflow runs
- Publish to npm manually (CI handles this)

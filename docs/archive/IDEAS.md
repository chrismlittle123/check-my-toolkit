# Expanded Feature Categories

A comprehensive breakdown of what each package could cover.

---

## Check-my-code (Static Analysis & Conventions)

| Category                 | Items                                       | Tools to Wrap                   |
| ------------------------ | ------------------------------------------- | ------------------------------- |
| Linting                  | All languages, formatting                   | MegaLinter                      |
| Naming conventions       | Files, directories, variables, functions    | ls-lint, custom rules           |
| Unused code              | Dead exports, files, dependencies           | Knip                            |
| Security                 | SAST, secrets, vulnerabilities              | Gitleaks, Trivy, Semgrep        |
| Complexity               | Cyclomatic complexity, cognitive complexity | SonarQube rules, ESLint plugins |
| Duplication              | Copy-paste detection                        | jscpd (in MegaLinter)           |
| Spelling                 | Code comments, strings, docs                | cspell, typos                   |
| Commit messages          | Conventional commits format                 | commitlint                      |
| License headers          | Required headers in files                   | addlicense, custom              |
| API contracts            | OpenAPI/GraphQL schema validation           | Spectral, graphql-schema-linter |
| Dependency health        | Outdated, deprecated, vulnerable deps       | npm-check, Dependabot rules     |
| Import ordering          | Consistent import structure                 | ESLint plugins, isort           |
| TODO/FIXME tracking      | Stale todos, missing issue links            | todo-to-issue, custom           |
| Test coverage thresholds | Minimum coverage requirements               | nyc, coverage.py                |
| Bundle size limits       | Max size for artifacts                      | bundlesize, size-limit          |

---

## Check-my-process (Workflow & Policy Enforcement)

| Category          | Items                                          | Tools to Wrap                    |
| ----------------- | ---------------------------------------------- | -------------------------------- |
| Branch protection | Required reviews, status checks, force push    | Allstar, safe-settings           |
| PR requirements   | Templates, linked issues, size limits          | Danger.js, custom                |
| Linear workflow   | Required states, labels, estimates, assignees  | Build custom (Linear API)        |
| Issue hygiene     | Templates, required fields, stale issues       | actions/stale, custom            |
| CODEOWNERS        | Presence and validity                          | GitHub native, custom validation |
| Required files    | README, LICENSE, CONTRIBUTING, SECURITY.md     | Allstar, Repolinter              |
| Changelog         | Enforced changelog updates                     | changesets, semantic-release     |
| Release process   | Tag format, release notes, versioning          | semantic-release rules           |
| CI/CD checks      | Required workflows, job naming, timeout limits | Custom                           |
| Merge strategy    | Squash/rebase/merge enforcement                | safe-settings                    |
| Review SLAs       | Max time to first review, approval             | Custom (GitHub API)              |
| Deployment gates  | Required approvals, environment protection     | GitHub native, custom            |

---

## Check-my-stack (Architecture & Infrastructure)

| Category           | Items                                               | Tools to Wrap            |
| ------------------ | --------------------------------------------------- | ------------------------ |
| ADRs               | Required ADRs, template compliance, status tracking | adr-tools, custom        |
| RFCs               | Required for major changes, approval workflow       | Custom                   |
| Service READMEs    | Required sections, freshness                        | Custom                   |
| Runbooks           | Required for production services                    | Custom                   |
| System map         | Registry of services, dependencies, ownership       | Custom                   |
| IaC compliance     | CDK/Terraform best practices, drift detection       | checkov, tflint, cdk-nag |
| Container security | Image scanning, base image policies                 | Trivy, Snyk              |
| Dependency graphs  | Cross-service dependencies, circular detection      | Custom                   |
| API documentation  | OpenAPI specs required and valid                    | Spectral                 |
| Database schemas   | Migration hygiene, schema docs                      | Custom                   |
| Observability      | Required metrics, logs, traces definitions          | Custom                   |
| Cost tagging       | Required cost allocation tags                       | Cloud-specific tools     |

The Agent-Ready Software Organisation

*A Vision for AI-Native Software Development*

The Big Idea

2026 will be the year of autonomous coding agents. These agents will write code, fix bugs, update documentation, and maintain infrastructure---running continuously in the cloud. But they can only operate effectively if they have access to everything they need: code, documentation, processes, standards, and organisational context.

The problem is that most organisations store critical knowledge across dozens of disconnected tools---Notion pages nobody reads, Slack threads that disappear, meeting decisions that live only in memory. Agents cannot access this. Humans struggle to find it.

**The solution: build an organisation where everything that matters is written down, machine-readable, version-controlled, and accessible through a unified interface.** Git becomes the source of truth. An MCP server becomes the gateway for agents. Humans shift from writing code to architecting systems and defining specifications.

Core Principles

1.  **Everything in Git.** Code, documentation, architecture decisions, process definitions, infrastructure-as-code, CI/CD pipelines, and standards all live in version-controlled repositories. If it\'s not in Git, it doesn\'t exist to the agent.

2.  **Enforcement through CI.** Documentation isn\'t optional. A documentation checking tool runs in CI and fails builds when required documentation is missing, malformed, or incomplete. ADRs must follow templates. New services must have READMEs. Specs must exist before implementation.

3.  **Git is the source of truth.** Linear is a dashboard for Git---a visibility layer, not the system of record. Ticket state, specs, and progress are defined in Git. Linear reflects this state for human convenience. Like infrastructure-as-code, this is "workflow-as-code": agents run sync commands that update Linear from Git, not the other way around. If there's a conflict, Git wins.

4.  **MCP as the agent interface.** A Model Context Protocol server provides agents with unified access to Git repositories, Linear tickets, organisational context, and system maps. Guardrails define what agents can read, write, and when they must stop and ask humans.

5.  **Humans architect, agents implement.** Human engineers focus on ambiguity resolution, architectural decisions, specifications, client relationships, and quality review. Agents handle implementation, testing, documentation maintenance, and routine updates.

The Architecture

What Lives in Git

- **Code:** Application code, tests, Dockerfiles, service definitions

- **Documentation:** ADRs, RFCs, specs, runbooks, onboarding guides, decisions made

- **Processes:** Coding standards, PR rules, workflow definitions, templates, agent guardrails

- **Stack:** Infrastructure-as-code (CDK), CI/CD pipelines, environment configs, observability definitions

- **Registry:** System map of all repositories, services, tools, and how to access them

What Stays Outside Git (Ephemeral Tools)

- **Linear:** A visibility dashboard that syncs from Git. Agents run skills like `sync-linear` to push ticket state from Git to Linear. Humans use Linear to view progress, but changes flow Git → Linear, never the reverse.

- **Slack:** Communication---decisions extracted to Git, conversations stay ephemeral

- **Meetings:** Synchronous discussion---outcomes documented in Git when decisions are made

- **Email:** External communication---rarely needs to enter the knowledge base

The Agent Development Process

When a ticket is marked ready for development, an agent picks it up and follows a defined process: read the spec and related ADRs, plan the implementation, write code and tests, validate against CI checks, open a PR, and respond to human review feedback. Humans approve and merge. Agents never deploy to production without human approval.

Critical to this workflow: **specs must be unambiguous**. A structured spec format defines acceptance criteria, API contracts, technical constraints, and out-of-scope items. If an agent encounters ambiguity, it stops and asks rather than guessing.

Human vs Agent Zones

**Humans handle:** ambiguity resolution, novel architecture, product judgment, stakeholder navigation, risk assessment, security judgment, crisis management, and client relationships. These require intuition, relationships, and contextual understanding that agents lack.

**Agents handle:** implementation from specs, test writing, documentation updates, bug fixes with clear reproduction steps, refactoring, dependency upgrades, and CI/CD maintenance. These are well-defined, repeatable, and benefit from tireless execution.

Known Gaps to Solve

1.  **Capture automation.** How do Slack decisions and meeting outcomes actually get into Git? Manual discipline isn\'t reliable. Need bots, transcription summaries, or agent-assisted capture.

2.  **Spec bottleneck.** If humans write specs and agents implement, can humans write specs fast enough? Agents may need to draft specs from rough tickets for human refinement.

3.  **Agent orchestration.** Who assigns tickets to agents? How do multiple agents coordinate without conflicts? Need an orchestration layer that manages assignment, monitors progress, and handles stuck agents.

4.  **Registry maintenance.** The system map must stay current. Auto-generation from GitHub plus manual enrichment, with CI checks for drift.

5.  **Feedback loops.** When humans review agent PRs, how do we capture what went wrong and improve agent performance over time?

6.  **Observability.** Need dashboards showing agent throughput, quality metrics, escalation rates, and cost per ticket.


____

"The entire organisation — specs, decisions, standards, processes, business rules, infrastructure — should be TypeScript objects in Git, validated by Zod, enforced by CI, rendered by React for humans, and queryable by agents."
import * as yaml from "js-yaml";

import { type CheckResult, type Violation } from "../../types/index.js";
import { BaseProcessToolRunner } from "./base.js";

/** CI configuration from check.toml */
interface CiConfig {
  enabled?: boolean;
  require_workflows?: string[];
  jobs?: Record<string, string[]>;
  actions?: Record<string, string[]>;
}

/** Parsed GitHub Actions workflow structure */
interface WorkflowFile {
  jobs?: Record<string, WorkflowJob>;
}

interface WorkflowJob {
  steps?: WorkflowStep[];
}

interface WorkflowStep {
  uses?: string;
}

/**
 * CI/CD workflow validation runner.
 * Checks that GitHub Actions workflows exist and contain required jobs/actions.
 */
export class CiRunner extends BaseProcessToolRunner {
  readonly name = "CI";
  readonly rule = "process.ci";
  readonly toolId = "ci";

  private config: CiConfig = {
    enabled: false,
  };

  /**
   * Set configuration from check.toml
   */
  setConfig(config: CiConfig): void {
    this.config = { ...this.config, ...config };
  }

  /** Check if .github/workflows directory exists */
  private checkWorkflowsDirectory(projectRoot: string): Violation | null {
    if (this.directoryExists(projectRoot, ".github/workflows")) {
      return null;
    }
    return {
      rule: `${this.rule}.directory`,
      tool: this.toolId,
      message: "GitHub workflows directory not found (.github/workflows/)",
      severity: "error",
    };
  }

  /** Check that required workflow files exist */
  private checkRequiredWorkflows(projectRoot: string): Violation[] {
    const workflows = this.config.require_workflows ?? [];
    return workflows
      .filter((workflow) => !this.fileExists(projectRoot, `.github/workflows/${workflow}`))
      .map((workflow) => ({
        rule: `${this.rule}.workflow`,
        tool: this.toolId,
        file: `.github/workflows/${workflow}`,
        message: `Required workflow '${workflow}' not found`,
        severity: "error" as const,
      }));
  }

  /** Result of parsing a workflow file */
  private parseWorkflow(
    projectRoot: string,
    workflowFile: string
  ): { workflow: WorkflowFile | null; parseError?: string } {
    const content = this.readFile(projectRoot, `.github/workflows/${workflowFile}`);
    if (content === null) {
      return { workflow: null };
    }
    try {
      return { workflow: yaml.load(content) as WorkflowFile };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown YAML parse error";
      return { workflow: null, parseError: message };
    }
  }

  /** Check that required jobs exist in workflows */
  private checkRequiredJobs(projectRoot: string): Violation[] {
    const jobsConfig = this.config.jobs ?? {};
    const violations: Violation[] = [];

    for (const [workflowFile, requiredJobs] of Object.entries(jobsConfig)) {
      const { workflow, parseError } = this.parseWorkflow(projectRoot, workflowFile);

      // Report YAML parse errors instead of silently skipping
      if (parseError) {
        violations.push({
          rule: `${this.rule}.yaml`,
          tool: this.toolId,
          file: `.github/workflows/${workflowFile}`,
          message: `Invalid YAML in workflow '${workflowFile}': ${parseError}`,
          severity: "error",
        });
        continue;
      }

      if (!workflow) {
        continue; // Skip if workflow file doesn't exist
      }

      const existingJobs = Object.keys(workflow.jobs ?? {});
      for (const requiredJob of requiredJobs) {
        if (!existingJobs.includes(requiredJob)) {
          violations.push({
            rule: `${this.rule}.jobs`,
            tool: this.toolId,
            file: `.github/workflows/${workflowFile}`,
            message: `Workflow '${workflowFile}' missing required job: ${requiredJob}`,
            severity: "error",
          });
        }
      }
    }

    return violations;
  }

  /** Extract all action names used in a workflow (without version tags) */
  private extractUsedActions(workflow: WorkflowFile): string[] {
    const usedActions: string[] = [];
    for (const job of Object.values(workflow.jobs ?? {})) {
      for (const step of job.steps ?? []) {
        if (step.uses) {
          // Extract action name (e.g., "actions/checkout@v4" -> "actions/checkout")
          usedActions.push(step.uses.split("@")[0]);
        }
      }
    }
    return usedActions;
  }

  /** Check that required actions are used in workflows */
  private checkRequiredActions(projectRoot: string): Violation[] {
    const actionsConfig = this.config.actions ?? {};
    const violations: Violation[] = [];

    for (const [workflowFile, requiredActions] of Object.entries(actionsConfig)) {
      const { workflow, parseError } = this.parseWorkflow(projectRoot, workflowFile);

      // Report YAML parse errors instead of silently skipping
      if (parseError) {
        violations.push({
          rule: `${this.rule}.yaml`,
          tool: this.toolId,
          file: `.github/workflows/${workflowFile}`,
          message: `Invalid YAML in workflow '${workflowFile}': ${parseError}`,
          severity: "error",
        });
        continue;
      }

      if (!workflow) {
        continue; // Skip if workflow file doesn't exist
      }

      const usedActions = this.extractUsedActions(workflow);
      for (const requiredAction of requiredActions) {
        if (!usedActions.includes(requiredAction)) {
          violations.push({
            rule: `${this.rule}.actions`,
            tool: this.toolId,
            file: `.github/workflows/${workflowFile}`,
            message: `Workflow '${workflowFile}' missing required action: ${requiredAction}`,
            severity: "error",
          });
        }
      }
    }

    return violations;
  }

  /** Run CI/CD workflow validation */
  async run(projectRoot: string): Promise<CheckResult> {
    const startTime = Date.now();
    const elapsed = (): number => Date.now() - startTime;

    // Check workflows directory first - if not present, can't check workflows
    const directoryViolation = this.checkWorkflowsDirectory(projectRoot);
    if (directoryViolation) {
      return this.fromViolations([directoryViolation], elapsed());
    }

    const violations = [
      ...this.checkRequiredWorkflows(projectRoot),
      ...this.checkRequiredJobs(projectRoot),
      ...this.checkRequiredActions(projectRoot),
    ];

    return this.fromViolations(violations, elapsed());
  }
}

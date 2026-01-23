/**
 * Types for resource checkers
 */

import type { ParsedArn, ResourceCheckResult } from "../types.js";

/**
 * Interface for service-specific resource checkers
 */
export interface ResourceChecker {
  /**
   * Check if a resource exists
   *
   * @param arn - Parsed ARN of the resource
   * @returns Check result with exists status and optional error
   */
  check(arn: ParsedArn): Promise<ResourceCheckResult>;
}

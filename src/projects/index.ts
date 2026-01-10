/**
 * Projects module
 *
 * Provides project detection and initialization capabilities
 */

// Re-export types
export type {
  ConfigStatus,
  DetectedProject,
  DetectionResult,
  DetectOptions,
  FixOptions,
  FixResult,
  ProjectType,
} from "./types.js";

// Re-export functions
export { detectProjects } from "./detector.js";
export { fixProjects, generateConfig } from "./generator.js";

import type {
  ExecutionStage,
  ExecutionStatus
} from "./types.js";

export const EXECUTION_STAGE_ORDER: ExecutionStage[] = [
  "DATA_RECEIVED",
  "EXTRACTION",
  "CLASSIFICATION",
  "VALIDATION",
  "DUPLICATE_DETECTION",
  "EVIDENCE",
  "DATA_READY"
];

export function executionProgress(
  stage: ExecutionStage
): number {
  const index =
    EXECUTION_STAGE_ORDER.indexOf(stage);

  if (index < 0) {
    return 0;
  }

  return Math.round(
    (index / (EXECUTION_STAGE_ORDER.length - 1)) * 100
  );
}

export function isTerminalStatus(
  status: ExecutionStatus
): boolean {
  return (
    status === "COMPLETED" ||
    status === "FAILED" ||
    status === "CANCELLED"
  );
}

export function nextStage(
  stage: ExecutionStage
): ExecutionStage | null {
  const index =
    EXECUTION_STAGE_ORDER.indexOf(stage);

  if (
    index < 0 ||
    index >= EXECUTION_STAGE_ORDER.length - 1
  ) {
    return null;
  }

  return EXECUTION_STAGE_ORDER[index + 1];
}

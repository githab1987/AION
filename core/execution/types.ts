export const EXECUTION_STATUSES = [
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
] as const;

export type ExecutionStatus =
  (typeof EXECUTION_STATUSES)[number];

export const EXECUTION_STAGES = [
  "DATA_RECEIVED",
  "EXTRACTION",
  "CLASSIFICATION",
  "VALIDATION",
  "DUPLICATE_DETECTION",
  "EVIDENCE",
  "DATA_READY"
] as const;

export type ExecutionStage =
  (typeof EXECUTION_STAGES)[number];

export interface ExecutionRecord {
  id: string;
  tenantId: string;
  workspaceId: string;
  ingestionJobId: string;
  dataObjectId: string | null;

  status: ExecutionStatus;
  currentStage: ExecutionStage;
  progress: number;

  result: Record<string, unknown>;
  error: Record<string, unknown> | null;

  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

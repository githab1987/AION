import {
  supabaseAdmin
} from "../../infrastructure/supabase/client.js";

import {
  executionProgress,
  nextStage
} from "./lifecycle.js";

import {
  processExecutionStage
} from "./stages.js";

import type {
  ExecutionStage,
  ExecutionStatus
} from "./types.js";

interface CreateExecutionInput {
  tenantId: string;
  workspaceId: string;
  ingestionJobId: string;
  dataObjectId?: string | null;
}

interface ExecutionRow {
  id: string;
  tenant_id: string;
  workspace_id: string;
  ingestion_job_id: string;
  data_object_id: string | null;
  status: ExecutionStatus;
  current_stage: ExecutionStage;
  progress: number;
  result: Record<string, unknown>;
  error: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapExecution(
  row: ExecutionRow
) {
  return {
    id:
      row.id,

    tenantId:
      row.tenant_id,

    workspaceId:
      row.workspace_id,

    ingestionJobId:
      row.ingestion_job_id,

    dataObjectId:
      row.data_object_id,

    status:
      row.status,

    currentStage:
      row.current_stage,

    progress:
      row.progress,

    result:
      row.result || {},

    error:
      row.error || null,

    startedAt:
      row.started_at,

    completedAt:
      row.completed_at,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at
  };
}

export async function createExecution(
  input: CreateExecutionInput
) {
  const {
    data,
    error
  } = await supabaseAdmin
    .from("execution_runs")
    .insert({
      tenant_id:
        input.tenantId,

      workspace_id:
        input.workspaceId,

      ingestion_job_id:
        input.ingestionJobId,

      data_object_id:
        input.dataObjectId ?? null,

      status:
        "QUEUED",

      current_stage:
        "DATA_RECEIVED",

      progress:
        executionProgress(
          "DATA_RECEIVED"
        ),

      result:
        {},

      error:
        null
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapExecution(
    data as ExecutionRow
  );
}

export async function startExecution(
  executionId: string
) {
  const {
    data,
    error
  } = await supabaseAdmin
    .from("execution_runs")
    .update({
      status:
        "RUNNING",

      started_at:
        new Date().toISOString()
    })
    .eq(
      "id",
      executionId
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapExecution(
    data as ExecutionRow
  );
}

export async function advanceExecution(
  executionId: string
) {
  const {
    data: current,
    error: currentError
  } = await supabaseAdmin
    .from("execution_runs")
    .select("*")
    .eq(
      "id",
      executionId
    )
    .single();

  if (currentError) {
    throw currentError;
  }

  const row =
    current as ExecutionRow;

  /*
   * Execute the current stage before
   * moving to the next stage.
   */
  const stageResult =
    await processExecutionStage(
      {
        executionId:
          row.id,

        tenantId:
          row.tenant_id,

        workspaceId:
          row.workspace_id,

        ingestionJobId:
          row.ingestion_job_id,

        dataObjectId:
          row.data_object_id ?? ""
      },
      row.current_stage
    );

  const nextResults: Record<
    string,
    unknown
  > = {
    ...(row.result || {}),

    [row.current_stage]:
      stageResult
  };

  const upcomingStage =
    nextStage(
      row.current_stage
    );

  /*
   * DATA_READY is the final stage.
   * The stage has just been processed,
   * therefore execution is now complete.
   */
  if (!upcomingStage) {

    const {
      data,
      error
    } = await supabaseAdmin
      .from("execution_runs")
      .update({
        status:
          "COMPLETED",

        current_stage:
          "DATA_READY",

        progress:
          100,

        result:
          nextResults,

        completed_at:
          new Date().toISOString()
      })
      .eq(
        "id",
        executionId
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapExecution(
      data as ExecutionRow
    );
  }

  /*
   * Move to next stage.
   */
  const {
    data,
    error
  } = await supabaseAdmin
    .from("execution_runs")
    .update({
      status:
        "RUNNING",

      current_stage:
        upcomingStage,

      progress:
        executionProgress(
          upcomingStage
        ),

      result:
        nextResults
    })
    .eq(
      "id",
      executionId
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapExecution(
    data as ExecutionRow
  );
}

export async function failExecution(
  executionId: string,
  errorPayload: Record<string, unknown>
) {
  const {
    data,
    error
  } = await supabaseAdmin
    .from("execution_runs")
    .update({
      status:
        "FAILED",

      error:
        errorPayload,

      completed_at:
        new Date().toISOString()
    })
    .eq(
      "id",
      executionId
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapExecution(
    data as ExecutionRow
  );
}

export async function getExecution(
  executionId: string,
  workspaceId: string
) {
  const {
    data,
    error
  } = await supabaseAdmin
    .from("execution_runs")
    .select("*")
    .eq(
      "id",
      executionId
    )
    .eq(
      "workspace_id",
      workspaceId
    )
    .single();

  if (error) {
    throw error;
  }

  return mapExecution(
    data as ExecutionRow
  );
}

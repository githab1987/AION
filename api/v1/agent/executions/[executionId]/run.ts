import type {
  VercelRequest,
  VercelResponse
} from "@vercel/node";

import {
  authorizeRequest
} from "../../../../../core/authorization/middleware.js";

import {
  getExecution,
  startExecution,
  advanceExecution,
  failExecution
} from "../../../../../core/execution/engine.js";

import {
  errorResponse,
  HttpError
} from "../../../../../shared/errors/http.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TERMINAL_STATUSES = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);

const MAX_STAGE_TRANSITIONS = 8;

function getExecutionId(req: VercelRequest): string {
  const value = req.query.executionId;

  const executionId =
    Array.isArray(value)
      ? value[0]
      : value;

  if (
    typeof executionId !== "string" ||
    !UUID_PATTERN.test(executionId)
  ) {
    throw new HttpError(
      400,
      "INVALID_EXECUTION_ID",
      "executionId must be a valid UUID"
    );
  }

  return executionId;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Only POST is supported"
    });
  }

  let executionId: string | null = null;

  try {
    const {
      authorization
    } = await authorizeRequest(req);

    const workspaceId =
      authorization.identity.workspaceId;

    executionId =
      getExecutionId(req);

    let execution =
      await getExecution(
        executionId,
        workspaceId
      );

    /*
     * Already finished:
     * return authoritative backend state.
     */
    if (
      TERMINAL_STATUSES.has(
        execution.status
      )
    ) {
      return res.status(200).json({
        ok: true,
        execution,
        source: "EXECUTION_RUNNER"
      });
    }

    /*
     * QUEUED -> RUNNING
     */
    if (
      execution.status === "QUEUED"
    ) {
      execution =
        await startExecution(
          executionId
        );
    }

    /*
     * Execute the complete deterministic
     * lifecycle for v0.1.
     *
     * The actual domain work will be plugged
     * into these stages next:
     *
     * EXTRACTION
     * CLASSIFICATION
     * VALIDATION
     * DUPLICATE_DETECTION
     * EVIDENCE
     * DATA_READY
     */
    let transitions = 0;

    while (
      execution.status === "RUNNING" &&
      transitions < MAX_STAGE_TRANSITIONS
    ) {
      execution =
        await advanceExecution(
          executionId
        );

      transitions += 1;

      if (
        execution.status === "COMPLETED" ||
        execution.status === "FAILED" ||
        execution.status === "CANCELLED"
      ) {
        break;
      }
    }

    /*
     * Safety guard.
     *
     * If the lifecycle somehow requires more
     * transitions than expected, fail explicitly
     * instead of silently returning an incomplete
     * execution.
     */
    if (
      execution.status === "RUNNING"
    ) {
      throw new HttpError(
        500,
        "EXECUTION_LIFECYCLE_INCOMPLETE",
        "Execution lifecycle did not reach a terminal state"
      );
    }

    return res.status(200).json({
      ok: true,
      execution,
      source: "EXECUTION_RUNNER",
      transitions
    });

  } catch (error) {

    /*
     * Best-effort failure persistence.
     *
     * Never replace the original error response
     * with a secondary persistence error.
     */
    try {
      if (executionId) {

        const {
          authorization
        } = await authorizeRequest(req);

        const existing =
          await getExecution(
            executionId,
            authorization.identity.workspaceId
          );

        if (
          !TERMINAL_STATUSES.has(
            existing.status
          )
        ) {
          await failExecution(
            executionId,
            {
              code:
                error instanceof HttpError
                  ? error.code
                  : "EXECUTION_RUNNER_FAILED",

              message:
                error instanceof Error
                  ? error.message
                  : "Execution runner failed",

              stage:
                existing.currentStage,

              requestId:
                authorization.identity.requestId
            }
          );
        }
      }
    } catch {
      /*
       * Preserve original error.
       */
    }

    const response =
      errorResponse(error);

    return res.status(
      response.statusCode
    ).json(
      response.body
    );
  }
}

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


/* ============================================================
   SPECIAL ALI
   EXECUTION RUNNER v0.1

   Purpose:

   QUEUED
      ↓
   RUNNING
      ↓
   DATA_RECEIVED
      ↓
   EXTRACTION
      ↓
   CLASSIFICATION
      ↓
   VALIDATION
      ↓
   DUPLICATE_DETECTION
      ↓
   EVIDENCE
      ↓
   DATA_READY
      ↓
   COMPLETED
============================================================ */


const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


function getExecutionId(
  req: VercelRequest
): string {

  const value =
    req.query.executionId;

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


/* ============================================================
   HANDLER
============================================================ */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {

  if (
    req.method !== "POST"
  ) {

    res.setHeader(
      "Allow",
      "POST"
    );

    return res
      .status(405)
      .json({
        ok: false,
        error: "METHOD_NOT_ALLOWED",
        message: "Only POST is supported"
      });

  }


  try {

    const {
      authorization
    } = await authorizeRequest(req);

    const workspaceId =
      authorization.identity.workspaceId;

    const executionId =
      getExecutionId(req);


    /* --------------------------------------------------------
       1. LOAD CURRENT EXECUTION
    -------------------------------------------------------- */

    let execution =
      await getExecution(
        executionId,
        workspaceId
      );


    /* --------------------------------------------------------
       2. TERMINAL EXECUTION
    -------------------------------------------------------- */

    if (
      execution.status === "COMPLETED" ||
      execution.status === "FAILED" ||
      execution.status === "CANCELLED"
    ) {

      return res
        .status(200)
        .json({
          ok: true,
          execution,
          source:
            "EXECUTION_RUNNER"
        });

    }


    /* --------------------------------------------------------
       3. START QUEUED EXECUTION
    -------------------------------------------------------- */

    if (
      execution.status === "QUEUED"
    ) {

      execution =
        await startExecution(
          executionId
        );

    }


    /* --------------------------------------------------------
       4. ADVANCE PIPELINE
    -------------------------------------------------------- */

    /*
      Each request advances exactly one stage.

      This keeps v0.1 deterministic and prevents
      a single serverless request from running an
      uncontrolled long process.
    */

    if (
      execution.status === "RUNNING"
    ) {

      execution =
        await advanceExecution(
          executionId
        );

    }


    /* --------------------------------------------------------
       5. FINAL RESPONSE
    -------------------------------------------------------- */

    return res
      .status(200)
      .json({

        ok: true,

        execution,

        source:
          "EXECUTION_RUNNER"

      });


  } catch (error) {

    try {

      const {
        authorization
      } = await authorizeRequest(req);

      const executionId =
        getExecutionId(req);

      /*
        Only attempt failure recording when
        the execution belongs to the caller's
        workspace.
      */

      const existing =
        await getExecution(
          executionId,
          authorization.identity.workspaceId
        );

      if (
        existing.status !== "COMPLETED" &&
        existing.status !== "FAILED" &&
        existing.status !== "CANCELLED"
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

    } catch {
      /*
        Never replace the original API error
        with a secondary failure-recording error.
      */
    }


    const response =
      errorResponse(error);

    return res
      .status(
        response.statusCode
      )
      .json(
        response.body
      );

  }

}

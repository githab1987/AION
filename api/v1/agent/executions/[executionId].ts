import type {
  VercelRequest,
  VercelResponse
} from "@vercel/node";

import {
  authorizeRequest
} from "../../../../core/authorization/middleware.js";

import {
  getExecution
} from "../../../../core/execution/engine.js";

import {
  errorResponse,
  HttpError
} from "../../../../shared/errors/http.js";


/* ============================================================
   SPECIAL ALI
   EXECUTION STATUS API
============================================================ */


/* ============================================================
   VALIDATION
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

  /* ----------------------------------------------------------
     METHOD
  ---------------------------------------------------------- */

  if (
    req.method !== "GET"
  ) {

    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Only GET is supported"
    });

  }


  try {

    /* --------------------------------------------------------
       AUTHORIZATION
    -------------------------------------------------------- */

    const {
      authorization
    } = await authorizeRequest(req);


    const workspaceId =
      authorization.identity.workspaceId;


    /* --------------------------------------------------------
       EXECUTION ID
    -------------------------------------------------------- */

    const executionId =
      getExecutionId(req);


    /* --------------------------------------------------------
       AUTHORITATIVE EXECUTION STATE
    -------------------------------------------------------- */

    const execution =
      await getExecution(
        executionId,
        workspaceId
      );


    /* --------------------------------------------------------
       AUTHORITATIVE RESPONSE
    -------------------------------------------------------- */

    return res.status(200).json({

      ok: true,

      execution,

      source:
        "EXECUTION_STATUS_API"

    });


  } catch (error) {

    const response =
      errorResponse(error);


    return res
      .status(response.statusCode)
      .json(response.body);

  }

}

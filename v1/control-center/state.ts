import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authorizeRequest } from "../../../core/authorization/middleware.js";
import { supabaseAdmin } from "../../../infrastructure/supabase/client.js";
import { errorResponse, HttpError } from "../../../shared/errors/http.js";

function optionalUuid(
  value: unknown,
  field: string
): string | null {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !== "string"
  ) {
    throw new HttpError(
      400,
      "INVALID_FIELD",
      `${field} must be a UUID string`
    );
  }

  return value;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {

  if (
    req.method !== "GET"
  ) {

    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });

  }

  try {

    const {
      authorization
    } = await authorizeRequest(req);

    const workspaceId =
      authorization.identity.workspaceId;

    const caseId =
      optionalUuid(
        req.query.case_id,
        "case_id"
      );

    const transactionId =
      optionalUuid(
        req.query.transaction_id,
        "transaction_id"
      );

    const {
      data,
      error
    } =
      await supabaseAdmin.rpc(
        "get_control_center_state",
        {
          p_workspace_id:
            workspaceId,

          p_case_id:
            caseId,

          p_transaction_id:
            transactionId
        }
      );

    if (error) {

      throw new HttpError(
        502,
        "CONTROL_CENTER_STATE_UNAVAILABLE",
        error.message
      );

    }

    return res.status(200).json({

      ok: true,

      workspace_id:
        workspaceId,

      case_id:
        caseId,

      transaction_id:
        transactionId,

      state:
        Array.isArray(data)
          ? data
          : [],

      source:
        "CONTROL_CENTER_STATE_API"

    });

  } catch (error) {

    const response =
      errorResponse(error);

    return res.status(
      response.statusCode
    ).json(
      response.body
    );

  }

}

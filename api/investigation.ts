import type {
  VercelRequest,
  VercelResponse
} from "@vercel/node";

import {
  authorizeRequest
} from "../core/authorization/middleware.js";

import {
  supabaseAdmin
} from "../infrastructure/supabase/client.js";

import {
  errorResponse,
  HttpError
} from "../shared/errors/http.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const { authorization } = await authorizeRequest(req);
    const workspaceId = authorization.identity.workspaceId;

    const { data, error } =
      await supabaseAdmin
        .from("investigation_items")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) {
      console.error("INVESTIGATION_LIST_FAILED", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });

      throw new HttpError(
        500,
        "INVESTIGATION_LIST_FAILED",
        "Unable to query investigation items"
      );
    }

    return res.status(200).json({
      ok: true,
      service: "SPECIAL ALI",
      component: "INVESTIGATION",
      count: data?.length ?? 0,
      items: data ?? []
    });

  } catch (error) {
    const response = errorResponse(error);
    return res.status(response.statusCode).json(response.body);
  }
}

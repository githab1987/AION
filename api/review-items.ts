import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authorizeRequest } from "../core/authorization/middleware.js";
import { supabaseAdmin } from "../infrastructure/supabase/client.js";
import { errorResponse, HttpError } from "../shared/errors/http.js";

const TABLE_BY_TYPE: Record<string, string> = {
  investigation: "investigation_items",
  accounting: "accounting_review_items",
  tax: "tax_review_items"
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const { authorization } = await authorizeRequest(req);
    const workspaceId = authorization.identity.workspaceId;

    const type = String(req.query.type || "");
    const table = TABLE_BY_TYPE[type];

    if (!table) {
      throw new HttpError(400, "INVALID_TYPE", "type harus investigation, accounting, atau tax");
    }

    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("REVIEW_ITEMS_LIST_FAILED", { table, message: error.message, details: error.details, hint: error.hint, code: error.code });
      throw new HttpError(500, "REVIEW_ITEMS_LIST_FAILED", "Unable to query review items");
    }

    return res.status(200).json({ ok: true, count: data?.length ?? 0, items: data ?? [] });
  } catch (error) {
    const response = errorResponse(error);
    return res.status(response.statusCode).json(response.body);
  }
          }

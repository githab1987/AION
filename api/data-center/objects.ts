import type {
  VercelRequest,
  VercelResponse
} from "@vercel/node";

import { authorizeRequest } from "../../core/authorization/middleware.js";
import { authorizeDataObjectAccess } from "../../core/data-center/access.js";
import { supabaseAdmin } from "../../infrastructure/supabase/client.js";
import { errorResponse } from "../../shared/errors/http.js";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    const { authorization } =
      await authorizeRequest(req);

    const rawId = req.query.id;

    if (typeof rawId !== "string") {
      return res.status(400).json({
        ok: false,
        error: "DATA_OBJECT_ID_REQUIRED"
      });
    }

    if (!isUuid(rawId)) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_DATA_OBJECT_ID"
      });
    }

    await authorizeDataObjectAccess(
      authorization,
      rawId,
      "READ"
    );

    const { data, error } =
      await supabaseAdmin
        .from("data_objects")
        .select(`
          id,
          tenant_id,
          workspace_id,
          source_id,
          object_type,
          status,
          name,
          description,
          mime_type,
          file_extension,
          size_bytes,
          content_hash,
          content_hash_algorithm,
          version,
          parent_object_id,
          metadata,
          provenance,
          classification,
          registered_by,
          created_at,
          updated_at
        `)
        .eq("id", rawId)
        .eq(
          "workspace_id",
          authorization.identity.workspaceId
        )
        .maybeSingle();

    if (error) {
      throw new Error(
        "DATA_OBJECT_QUERY_FAILED"
      );
    }

    if (!data) {
      return res.status(404).json({
        ok: false,
        error: "DATA_OBJECT_NOT_FOUND"
      });
    }

    return res.status(200).json({
      ok: true,
      service: "SPECIAL ALI",
      component: "DATA_CENTER",
      resource: "DATA_OBJECT",
      status: "AVAILABLE",
      data
    });

  } catch (error) {

    const response = errorResponse(error);

    return res
      .status(response.statusCode)
      .json(response.body);
  }
}

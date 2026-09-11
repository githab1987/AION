import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../infrastructure/supabase/client.js";

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
    const { error } = await supabaseAdmin
      .from("system_metadata")
      .select("key")
      .limit(1);

    if (error) {
      return res.status(503).json({
        ok: false,
        service: "SPECIAL ALI",
        component: "SUPABASE",
        status: "UNAVAILABLE",
        error: "SUPABASE_QUERY_FAILED"
      });
    }

    return res.status(200).json({
      ok: true,
      service: "SPECIAL ALI",
      component: "SUPABASE",
      status: "CONNECTED"
    });
  } catch {
    return res.status(503).json({
      ok: false,
      service: "SPECIAL ALI",
      component: "SUPABASE",
      status: "UNAVAILABLE",
      error: "SUPABASE_CONNECTION_FAILED"
    });
  }
}

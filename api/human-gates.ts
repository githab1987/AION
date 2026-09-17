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

type JsonRecord = Record<string, unknown>;

function json(
  res: VercelResponse,
  status: number,
  payload: JsonRecord
) {
  return res.status(status).json(payload);
}

function normalizeString(
  value: unknown
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/* ============================================================
   GET - daftar human gate untuk workspace
============================================================ */

async function handleGet(
  req: VercelRequest,
  res: VercelResponse
) {
  const { authorization } = await authorizeRequest(req);
  const workspaceId = authorization.identity.workspaceId;

  const statusFilter =
    normalizeString(req.query.status as string | undefined) ?? "OPEN";

  const { data, error } =
    await supabaseAdmin
      .from("human_gates")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", statusFilter)
      .order("opened_at", { ascending: false })
      .limit(50);

  if (error) {
    console.error("HUMAN_GATE_LIST_FAILED", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });

    throw new HttpError(
      500,
      "HUMAN_GATE_LIST_FAILED",
      "Unable to query human gates"
    );
  }

  return json(res, 200, {
    ok: true,
    service: "SPECIAL ALI",
    component: "HUMAN_GATE",
    count: data?.length ?? 0,
    human_gates: data ?? []
  });
}

/* ============================================================
   POST - putuskan (approve / reject) satu human gate
============================================================ */

async function handlePost(
  req: VercelRequest,
  res: VercelResponse
) {
  const { authorization } = await authorizeRequest(req);
  const { workspaceId, userId } = authorization.identity;

  const body =
    (req.body && typeof req.body === "object"
      ? req.body
      : {}) as JsonRecord;

  const humanGateId = normalizeString(body.human_gate_id);

  if (!humanGateId || !isUuid(humanGateId)) {
    throw new HttpError(
      400,
      "HUMAN_GATE_ID_REQUIRED",
      "human_gate_id wajib diisi dan harus UUID valid"
    );
  }

  const decision = normalizeString(body.decision);

  if (decision !== "APPROVE" && decision !== "REJECT") {
    throw new HttpError(
      400,
      "INVALID_DECISION",
      "decision harus APPROVE atau REJECT"
    );
  }

  const reason = normalizeString(body.reason);
  const now = new Date().toISOString();
  const nextStatus = decision === "APPROVE" ? "PASS" : "BLOCK";
  
  const { data, error } =
    await supabaseAdmin
      .from("human_gates")
      .update({
        status: nextStatus,
        decided_by: userId,
        decision_reason: reason,
        decided_at: now,
        updated_at: now
      })
      .eq("id", humanGateId)
      .eq("workspace_id", workspaceId)
      .eq("status", "OPEN")
      .select("*")
      .maybeSingle();

  if (error) {
    console.error("HUMAN_GATE_DECIDE_FAILED", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });

    throw new HttpError(
      500,
      "HUMAN_GATE_DECIDE_FAILED",
      "Unable to update human gate"
    );
  }

  if (!data) {
  throw new HttpError(
    404,
    "HUMAN_GATE_NOT_FOUND_OR_ALREADY_DECIDED",
    "Human gate tidak ditemukan atau sudah diputuskan sebelumnya"
  );
}

/* ============================================================
   ROUTE TO INVESTIGATION (jika APPROVE dan tujuan INVESTIGATE)
============================================================ */

if (decision === "APPROVE") {
  let context: any = {};
  try {
    context = typeof data.context === "string"
      ? JSON.parse(data.context)
      : (data.context || {});
  } catch {
    context = {};
  }

  const routingSelected = context?.routing?.selected;

  if (routingSelected === "INVESTIGATE") {
    const { error: insertError } = await supabaseAdmin
      .from("investigation_items")
      .insert({
        tenant_id: data.tenant_id,
        workspace_id: data.workspace_id,
        source_human_gate_id: data.id,
        data_object_id: context?.data_object_id ?? null,
        ingestion_job_id: context?.ingestion_job_id ?? null,
        title: data.reason ?? "Investigation item",
        reason: data.reason ?? null,
        status: "OPEN"
      });

    if (insertError) {
      console.error("INVESTIGATION_ITEM_INSERT_FAILED", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
    }
  }
}

return json(res, 200, {
  ok: true,
  service: "SPECIAL ALI",
  component: "HUMAN_GATE",
  human_gate: data
});
}

/* ============================================================
   HANDLER
============================================================ */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    if (req.method === "POST") {
      return await handlePost(req, res);
    }
    return await handleGet(req, res);
  } catch (error) {
    const response = errorResponse(error);
    return res.status(response.statusCode).json(response.body);
  }
}

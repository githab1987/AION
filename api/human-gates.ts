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

function buildDomainInsight(
  domains: string[],
  parsed: any,
  sourceName: string
): string {

  const sheets = Array.isArray(parsed?.sheets) ? parsed.sheets : [];
  const allLineItems: any[] = [];

  for (const sheet of sheets) {
    if (Array.isArray(sheet.line_items)) {
      for (const item of sheet.line_items) {
        allLineItems.push({ ...item, sheet_name: sheet.sheet_name });
      }
    }
  }

  const rupiah = (n: number) =>
    "Rp" + Math.round(Math.abs(n)).toLocaleString("id-ID");

  const parts: string[] = [];

  if (domains.includes("ACCOUNTING")) {

    // batasi cuma ke sheet yang namanya mengandung "balance sheet"
    // atau "neraca" - biar ga kecampur sheet lain.
    const balanceItems = allLineItems.filter(
      (item) =>
        typeof item.sheet_name === "string" &&
        /balance sheet|neraca/i.test(item.sheet_name)
    );

    const findExact = (keyword: string) =>
      balanceItems.find(
        (item) =>
          typeof item.label === "string" &&
          item.label.toLowerCase().trim() === keyword
      );

    const aktiva = findExact("jumlah aktiva");
    const kewajibanLancar = findExact("jumlah kewajiban lancar");
    const kewajibanPanjang = findExact(
      "jumlah kewajiban jangka panjang"
    );

    if (aktiva && typeof aktiva.value === "number") {
      const totalKewajiban =
        (typeof kewajibanLancar?.value === "number"
          ? kewajibanLancar.value
          : 0) +
        (typeof kewajibanPanjang?.value === "number"
          ? kewajibanPanjang.value
          : 0);

      if (kewajibanLancar || kewajibanPanjang) {
        parts.push(
          `Akuntansi: Jumlah Aktiva ${rupiah(aktiva.value)}, ` +
            `Jumlah Kewajiban ${rupiah(totalKewajiban)} ` +
            `(belum termasuk ekuitas - bandingkan manual dengan Modal & Laba Ditahan).`
        );
      } else {
        parts.push(
          `Akuntansi: Jumlah Aktiva ${rupiah(aktiva.value)}.`
        );
      }
    } else if (balanceItems.length > 0) {
      parts.push(
        `Akuntansi: ${balanceItems.length} baris neraca ditemukan.`
      );
    }
  }

  if (domains.includes("TAX")) {

    const taxItems = allLineItems.filter(
      (item) =>
        typeof item.sheet_name === "string" &&
        /pph|pajak|prepaid/i.test(item.sheet_name) &&
        typeof item.value === "number" &&
        item.value !== 0
    );

    if (taxItems.length > 0) {
      const totalTax = taxItems.reduce(
        (sum, item) => sum + Math.abs(item.value),
        0
      );

      parts.push(
        `Pajak: ${taxItems.length} pos bernilai tidak-nol ditemukan ` +
          `(total nilai absolut ${rupiah(totalTax)}) - ` +
          `perlu dicocokkan dengan data akuntansi.`
      );
    }
  }

  if (domains.includes("INVESTIGATE") && parts.length === 0) {
    parts.push(
      "Tidak ditemukan pola akuntansi/pajak yang jelas - perlu ditinjau manual."
    );
  }

  if (parts.length === 0) {
    return `File "${sourceName}" diklasifikasikan sebagai ${domains.join(" & ")}.`;
  }

  return `File "${sourceName}" - ${parts.join(" ")}`;
}

async function attachInsight(gate: any): Promise<any> {

  let context: any = {};
  try {
    context =
      typeof gate.context === "string"
        ? JSON.parse(gate.context)
        : (gate.context || {});
  } catch {
    return gate;
  }

  if (!context?.ingestion_job_id) {
    return gate;
  }

  const { data: jobRow } = await supabaseAdmin
    .from("ingestion_jobs")
    .select("extraction, classification, source_name")
    .eq("id", context.ingestion_job_id)
    .maybeSingle();

  const domains = Array.isArray(jobRow?.classification?.domains)
    ? jobRow.classification.domains
    : [];

  if (domains.length === 0) {
    return gate;
  }

  const insight = buildDomainInsight(
    domains,
    jobRow?.extraction?.parsed ?? null,
    jobRow?.source_name ?? "file"
  );

  return { ...gate, reason: insight };
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

  const enrichedGates = await Promise.all(
    (data ?? []).map((gate) => attachInsight(gate))
  );

  return json(res, 200, {
    ok: true,
    service: "SPECIAL ALI",
    component: "HUMAN_GATE",
    count: enrichedGates.length,
    human_gates: enrichedGates
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
     ROUTE TO REVIEW TABLES (jika APPROVE)
  ============================================================ */

  function buildExtractedData(parsed: any): any {

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  if (
    parsed.fields &&
    typeof parsed.fields === "object" &&
    Object.keys(parsed.fields).length > 0
  ) {
    return {
      kind: "FIELDS",
      fields: parsed.fields
    };
  }

  if (Array.isArray(parsed.sheets)) {

    const sheets = parsed.sheets
      .map((sheet: any) => ({
        sheet_name: sheet.sheet_name,
        line_items:
          Array.isArray(sheet.line_items)
            ? sheet.line_items.filter(
                (item: any) => item.value !== null
              )
            : []
      }))
      .filter(
        (sheet: any) => sheet.line_items.length > 0
      );

    if (sheets.length > 0) {
      return {
        kind: "SPREADSHEET",
        sheets
      };
    }
  }

  return null;
  }
  
  if (decision === "APPROVE") {
    let context: any = {};
    try {
      context = typeof data.context === "string"
        ? JSON.parse(data.context)
        : (data.context || {});
    } catch {
      context = {};
    }

    let extractedData: any = null;
    let domains: string[] = [];

    if (context?.ingestion_job_id) {
      const { data: jobRow } = await supabaseAdmin
        .from("ingestion_jobs")
        .select("extraction, classification")
        .eq("id", context.ingestion_job_id)
        .maybeSingle();

      extractedData = buildExtractedData(jobRow?.extraction?.parsed ?? null);

      domains = Array.isArray(jobRow?.classification?.domains)
        ? jobRow.classification.domains
        : [];
    }

    const routingSelected = context?.routing?.selected;

    const commonFields = {
      tenant_id: data.tenant_id,
      workspace_id: data.workspace_id,
      source_human_gate_id: data.id,
      data_object_id: context?.data_object_id ?? null,
      ingestion_job_id: context?.ingestion_job_id ?? null,
      title: data.reason ?? "Review item",
      reason: data.reason ?? null,
      status: "OPEN",
      extracted_data: extractedData
    };

    const targets: string[] = [];

    if (domains.includes("INVESTIGATE")) {
      targets.push("investigation_items");
    }

    if (domains.includes("ACCOUNTING")) {
      targets.push("accounting_review_items");
    }

    if (domains.includes("TAX")) {
      targets.push("tax_review_items");
    }

    for (const table of targets) {
      const { error: insertError } = await supabaseAdmin
        .from(table)
        .insert(commonFields);

      if (insertError) {
        console.error("REVIEW_ITEM_INSERT_FAILED", {
          table,
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

import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  authorizeRequest,
  type AuthorizedRequestContext,
} from "../../core/auth/authorize";

import { supabaseAdmin } from "../../infrastructure/supabase/client";

type JsonRecord = Record<string, unknown>;

const STAGES = [
  "DATA_RECEIVED",
  "EXTRACTION",
  "CLASSIFICATION",
  "VALIDATION",
  "DUPLICATE_DETECTION",
  "EVIDENCE",
  "DATA_READY",
] as const;

type IngestionStage = (typeof STAGES)[number];

function json(
  res: VercelResponse,
  status: number,
  payload: JsonRecord
) {
  return res.status(status).json(payload);
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function getFileExtension(name: string): string | null {
  const index = name.lastIndexOf(".");

  if (index <= 0 || index === name.length - 1) {
    return null;
  }

  return name
    .slice(index + 1)
    .toLowerCase();
}

function detectObjectType(
  mimeType: string | null
): string {
  if (!mimeType) {
    return "DOCUMENT";
  }

  if (mimeType.startsWith("image/")) {
    return "IMAGE";
  }

  if (
    mimeType === "application/pdf" ||
    mimeType.includes("document") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("sheet")
  ) {
    return "DOCUMENT";
  }

  return "FILE";
}

function errorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return String(
      (error as { message: string }).message
    );
  }

  return "Terjadi kesalahan pada ingestion.";
}

function getBody(
  req: VercelRequest
): JsonRecord {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "object") {
    return req.body as JsonRecord;
  }

  if (typeof req.body === "string") {
    try {
      const parsed = JSON.parse(req.body);

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        return parsed as JsonRecord;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function getAuthorizationContext(
  req: VercelRequest
): AuthorizedRequestContext {
  return authorizeRequest(req);
}

async function handlePost(
  req: VercelRequest,
  res: VercelResponse,
  context: AuthorizedRequestContext
) {
  const body = getBody(req);

  const sourceName =
    normalizeString(body.source_name) ??
    normalizeString(body.name);

  if (!sourceName) {
    return json(res, 400, {
      ok: false,
      error: "source_name wajib diisi.",
    });
  }

  const mimeType =
    normalizeString(body.mime_type);

  const fileExtension =
    normalizeString(body.file_extension) ??
    getFileExtension(sourceName);

  const sizeBytes =
    typeof body.size_bytes === "number" &&
    Number.isFinite(body.size_bytes)
      ? Math.max(0, Math.floor(body.size_bytes))
      : null;

  const contentHash =
    normalizeString(body.content_hash);

  const metadata: JsonRecord =
    body.metadata &&
    typeof body.metadata === "object"
      ? body.metadata as JsonRecord
      : {};

  const objectType =
    normalizeString(body.object_type) ??
    detectObjectType(mimeType);

  const tenantId =
    context.workspace.tenant_id;

  const workspaceId =
    context.workspace.id;

  const userId =
    context.user.id;

  /*
   * ----------------------------------------------------------
   * 1. CREATE DATA OBJECT
   * ----------------------------------------------------------
   */

  const {
    data: dataObject,
    error: dataObjectError,
  } = await supabaseAdmin
    .from("data_objects")
    .insert({
      tenant_id: tenantId,
      workspace_id: workspaceId,
      source_id: null,

      object_type: objectType,

      status: "RECEIVED",

      name: sourceName,

      description:
        normalizeString(body.description),

      mime_type: mimeType,

      file_extension: fileExtension,

      size_bytes: sizeBytes,

      content_hash: contentHash,

      content_hash_algorithm:
        contentHash
          ? "SHA-256"
          : null,

      version: 1,

      parent_object_id: null,

      metadata,

      provenance: {
        source: "SPECIAL_ALI",
        ingestion: true,
        received_at:
          new Date().toISOString(),
      },

      classification: {},

      registered_by: userId,
    })
    .select(
      [
        "id",
        "tenant_id",
        "workspace_id",
        "object_type",
        "status",
        "name",
        "mime_type",
        "file_extension",
        "size_bytes",
        "content_hash",
        "version",
        "metadata",
        "provenance",
        "created_at",
        "updated_at",
      ].join(",")
    )
    .single();

  if (dataObjectError) {
    throw dataObjectError;
  }

  /*
   * ----------------------------------------------------------
   * 2. CREATE INGESTION JOB
   * ----------------------------------------------------------
   */

  const {
    data: ingestionJob,
    error: ingestionError,
  } = await supabaseAdmin
    .from("ingestion_jobs")
    .insert({
      tenant_id: tenantId,
      workspace_id: workspaceId,

      data_object_id:
        dataObject.id,

      source_name:
        sourceName,

      status:
        "RECEIVED",

      current_stage:
        "DATA_RECEIVED",

      input_metadata: {
        name: sourceName,
        mime_type: mimeType,
        file_extension: fileExtension,
        size_bytes: sizeBytes,
        content_hash: contentHash,
        object_type: objectType,
        metadata,
      },

      extraction: {},

      classification: {},

      validation: {},

      duplicate_detection: {},

      evidence: {},

      routing: {
        available: false,
        selected: null,
        options: [
          "ACCOUNTING",
          "TAX",
          "BOTH",
          "INVESTIGATE",
        ],
      },

      error: null,

      started_at:
        new Date().toISOString(),

      completed_at:
        null,
    })
    .select("*")
    .single();

  if (ingestionError) {
    /*
     * Roll back the data object if the
     * ingestion job could not be created.
     */
    await supabaseAdmin
      .from("data_objects")
      .delete()
      .eq("id", dataObject.id)
      .eq("workspace_id", workspaceId);

    throw ingestionError;
  }

  /*
   * ----------------------------------------------------------
   * 3. AUDIT EVENT
   * ----------------------------------------------------------
   */

  const requestId =
    normalizeString(
      req.headers["x-request-id"]
    );

  await supabaseAdmin
    .from("audit_events")
    .insert({
      tenant_id: tenantId,
      workspace_id: workspaceId,
      actor_id: userId,

      action:
        "INGESTION_JOB_CREATED",

      resource_type:
        "INGESTION_JOB",

      resource_id:
        ingestionJob.id,

      status:
        "SUCCESS",

      request_id:
        requestId,

      reason:
        "SPECIAL ALI data ingestion received.",

      metadata: {
        data_object_id:
          dataObject.id,

        source_name:
          sourceName,

        current_stage:
          "DATA_RECEIVED",
      },
    });

  /*
   * ----------------------------------------------------------
   * 4. RETURN AUTHORITATIVE STATE
   * ----------------------------------------------------------
   */

  return json(res, 201, {
    ok: true,

    ingestion: {
      id:
        ingestionJob.id,

      data_object_id:
        dataObject.id,

      status:
        "RECEIVED",

      current_stage:
        "DATA_RECEIVED",

      next_stage:
        "EXTRACTION",

      stages:
        STAGES,

      routing:
        ingestionJob.routing,
    },

    data_object:
      dataObject,
  });
}

async function handleGet(
  req: VercelRequest,
  res: VercelResponse,
  context: AuthorizedRequestContext
) {
  const workspaceId =
    context.workspace.id;

  const jobId =
    typeof req.query.id === "string"
      ? req.query.id
      : null;

  /*
   * ----------------------------------------------------------
   * SINGLE JOB
   * ----------------------------------------------------------
   */

  if (jobId) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from("ingestion_jobs")
      .select(
        `
          *,
          data_objects (
            id,
            name,
            object_type,
            status,
            mime_type,
            file_extension,
            size_bytes,
            content_hash,
            version,
            metadata,
            provenance,
            created_at,
            updated_at
          )
        `
      )
      .eq("workspace_id", workspaceId)
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return json(res, 404, {
        ok: false,
        error: "Ingestion job tidak ditemukan.",
      });
    }

    return json(res, 200, {
      ok: true,
      ingestion: data,
    });
  }

  /*
   * ----------------------------------------------------------
   * JOB LIST
   * ----------------------------------------------------------
   */

  const rawLimit =
    typeof req.query.limit === "string"
      ? Number(req.query.limit)
      : 25;

  const limit =
    Number.isFinite(rawLimit)
      ? Math.min(
          Math.max(Math.floor(rawLimit), 1),
          100
        )
      : 25;

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("ingestion_jobs")
    .select(
      `
        *,
        data_objects (
          id,
          name,
          object_type,
          status,
          mime_type,
          file_extension,
          size_bytes,
          content_hash,
          version,
          created_at,
          updated_at
        )
      `
    )
    .eq("workspace_id", workspaceId)
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(limit);

  if (error) {
    throw error;
  }

  return json(res, 200, {
    ok: true,
    count:
      data?.length ?? 0,

    ingestion:
      data ?? [],
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    if (
      req.method !== "GET" &&
      req.method !== "POST"
    ) {
      res.setHeader(
        "Allow",
        "GET, POST"
      );

      return json(res, 405, {
        ok: false,
        error: "Method not allowed.",
      });
    }

    const context =
      getAuthorizationContext(req);

    if (req.method === "POST") {
      return await handlePost(
        req,
        res,
        context
      );
    }

    return await handleGet(
      req,
      res,
      context
    );

  } catch (error) {
    console.error(
      "SPECIAL ALI ingestion error:",
      error
    );

    return json(res, 500, {
      ok: false,
      error:
        errorMessage(error),
    });
  }
}

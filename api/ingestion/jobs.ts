import type {
  VercelRequest,
  VercelResponse
} from "@vercel/node";

import {
  authorizeRequest
} from "../../core/authorization/middleware.js";

import {
  authorizeDataObjectAccess
} from "../../core/data-center/access.js";

import {
  createExecution
} from "../../core/execution/engine.js";

import {
  supabaseAdmin
} from "../../infrastructure/supabase/client.js";

import {
  errorResponse,
  HttpError
} from "../../shared/errors/http.js";

type JsonRecord =
  Record<string, unknown>;

const STAGES = [
  "DATA_RECEIVED",
  "EXTRACTION",
  "CLASSIFICATION",
  "VALIDATION",
  "DUPLICATE_DETECTION",
  "EVIDENCE",
  "DATA_READY"
] as const;

function json(
  res: VercelResponse,
  status: number,
  payload: JsonRecord
) {
  return res
    .status(status)
    .json(payload);
}

function normalizeString(
  value: unknown
): string | null {

  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function getFileExtension(
  name: string
): string | null {

  const index =
    name.lastIndexOf(".");

  if (
    index <= 0 ||
    index === name.length - 1
  ) {
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

  if (
    mimeType.startsWith("image/")
  ) {
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

function getBody(
  req: VercelRequest
): JsonRecord {

  if (!req.body) {
    return {};
  }

  if (
    typeof req.body === "object"
  ) {
    return req.body as JsonRecord;
  }

  if (
    typeof req.body === "string"
  ) {

    try {

      const parsed =
        JSON.parse(req.body);

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        return parsed as JsonRecord;
      }

    } catch {
      throw new HttpError(
        400,
        "INVALID_REQUEST_BODY",
        "Request body must contain valid JSON"
      );
    }
  }

  return {};
}

function isUuid(
  value: string
): boolean {

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value);
}

function safeStorageName(
  value: string
): string {

  return value
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180);
}

/* ============================================================
   POST
   CREATE INGESTION + EXECUTION + SIGNED UPLOAD
============================================================ */

async function handlePost(
  req: VercelRequest,
  res: VercelResponse
) {

  const {
    authorization
  } = await authorizeRequest(req);

  const {
    tenantId,
    workspaceId,
    userId,
    requestId
  } = authorization.identity;

  const body =
    getBody(req);

  const sourceName =
    normalizeString(
      body.source_name
    ) ??
    normalizeString(
      body.name
    );

  if (!sourceName) {
    throw new HttpError(
      400,
      "SOURCE_NAME_REQUIRED",
      "source_name wajib diisi"
    );
  }

  const mimeType =
    normalizeString(
      body.mime_type
    );

  const fileExtension =
    normalizeString(
      body.file_extension
    ) ??
    getFileExtension(
      sourceName
    );

  const sizeBytes =
    typeof body.size_bytes === "number" &&
    Number.isFinite(body.size_bytes)
      ? Math.max(
          0,
          Math.floor(
            body.size_bytes
          )
        )
      : null;

  const contentHash =
    normalizeString(
      body.content_hash
    );

  const metadata: JsonRecord =
    body.metadata &&
    typeof body.metadata === "object"
      ? body.metadata as JsonRecord
      : {};

  const objectType =
    normalizeString(
      body.object_type
    ) ??
    detectObjectType(
      mimeType
    );

  /* ----------------------------------------------------------
     1. DATA OBJECT
  ---------------------------------------------------------- */

  const {
    data: dataObject,
    error: dataObjectError
  } =
    await supabaseAdmin
      .from("data_objects")
      .insert({
        tenant_id:
          tenantId,

        workspace_id:
          workspaceId,

        source_id:
          null,

        object_type:
          objectType,

        status:
          "RECEIVED",

        name:
          sourceName,

        description:
          normalizeString(
            body.description
          ),

        mime_type:
          mimeType,

        file_extension:
          fileExtension,

        size_bytes:
          sizeBytes,

        content_hash:
          contentHash,

        content_hash_algorithm:
          contentHash
            ? "SHA-256"
            : null,

        version:
          1,

        parent_object_id:
          null,

        metadata,

        provenance: {
          source:
            "SPECIAL ALI",

          ingestion:
            true,

          received_at:
            new Date().toISOString()
        },

        classification:
          {},

        registered_by:
          userId
      })
      .select("*")
      .single();

  if (dataObjectError) {
    throw new HttpError(
      500,
      "DATA_OBJECT_CREATE_FAILED",
      "Unable to create data object"
    );
  }

  /* ----------------------------------------------------------
     2. DATA ACCESS AUTHORIZATION
  ---------------------------------------------------------- */

  try {

    await authorizeDataObjectAccess(
      authorization,
      dataObject.id,
      "WRITE"
    );

  } catch (error) {

    await supabaseAdmin
      .from("data_objects")
      .delete()
      .eq(
        "id",
        dataObject.id
      )
      .eq(
        "workspace_id",
        workspaceId
      );

    throw error;
  }

  /* ----------------------------------------------------------
     3. INGESTION JOB
  ---------------------------------------------------------- */

  const {
    data: ingestionJob,
    error: ingestionError
  } =
    await supabaseAdmin
      .from("ingestion_jobs")
      .insert({
        tenant_id:
          tenantId,

        workspace_id:
          workspaceId,

        data_object_id:
          dataObject.id,

        source_name:
          sourceName,

        status:
          "RECEIVED",

        current_stage:
          "DATA_RECEIVED",

        input_metadata: {
          name:
            sourceName,

          mime_type:
            mimeType,

          file_extension:
            fileExtension,

          size_bytes:
            sizeBytes,

          content_hash:
            contentHash,

          object_type:
            objectType,

          metadata
        },

        extraction:
          {},

        classification:
          {},

        validation:
          {},

        duplicate_detection:
          {},

        evidence:
          {},

        routing: {
          available:
            false,

          selected:
            null,

          options: [
            "ACCOUNTING",
            "TAX",
            "BOTH",
            "INVESTIGATE"
          ]
        },

        error:
          null,

        started_at:
          new Date().toISOString(),

        completed_at:
          null
      })
      .select("*")
      .single();

  if (ingestionError) {

    await supabaseAdmin
      .from("data_objects")
      .delete()
      .eq(
        "id",
        dataObject.id
      )
      .eq(
        "workspace_id",
        workspaceId
      );

    throw new HttpError(
      500,
      "INGESTION_JOB_CREATE_FAILED",
      "Unable to create ingestion job"
    );
  }

  /* ----------------------------------------------------------
     4. EXECUTION
  ---------------------------------------------------------- */

  let execution;

  try {

    execution =
      await createExecution({
        tenantId,
        workspaceId,
        ingestionJobId:
          ingestionJob.id,
        dataObjectId:
          dataObject.id
      });

  } catch (error) {

    await supabaseAdmin
      .from("ingestion_jobs")
      .delete()
      .eq(
        "id",
        ingestionJob.id
      )
      .eq(
        "workspace_id",
        workspaceId
      );

    await supabaseAdmin
      .from("data_objects")
      .delete()
      .eq(
        "id",
        dataObject.id
      )
      .eq(
        "workspace_id",
        workspaceId
      );

    throw new HttpError(
      500,
      "EXECUTION_CREATE_FAILED",
      "Unable to create execution"
    );
  }

  /* ----------------------------------------------------------
     5. SIGNED STORAGE UPLOAD
  ---------------------------------------------------------- */

  const storagePath =
    [
      workspaceId,
      dataObject.id,
      safeStorageName(sourceName)
    ].join("/");

  const {
    data: signedUpload,
    error: signedUploadError
  } =
    await supabaseAdmin
      .storage
      .from("evidence")
      .createSignedUploadUrl(
        storagePath
      );

  if (signedUploadError) {

    await supabaseAdmin
      .from("execution_runs")
      .delete()
      .eq(
        "id",
        execution.id
      );

    await supabaseAdmin
      .from("ingestion_jobs")
      .delete()
      .eq(
        "id",
        ingestionJob.id
      );

    await supabaseAdmin
      .from("data_objects")
      .delete()
      .eq(
        "id",
        dataObject.id
      );

    throw new HttpError(
      500,
      "SIGNED_UPLOAD_CREATE_FAILED",
      "Unable to create signed upload URL"
    );
  }

  /* ----------------------------------------------------------
     6. AUDIT
  ---------------------------------------------------------- */

  const {
    error: auditError
  } =
    await supabaseAdmin
      .from("audit_events")
      .insert({
        tenant_id:
          tenantId,

        workspace_id:
          workspaceId,

        actor_id:
          userId,

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

          execution_id:
            execution.id,

          source_name:
            sourceName,

          storage_path:
            storagePath,

          current_stage:
            "DATA_RECEIVED"
        }
      });

  if (auditError) {

    throw new HttpError(
      500,
      "AUDIT_EVENT_CREATE_FAILED",
      "Ingestion was created but audit registration failed"
    );
  }

  /* ----------------------------------------------------------
     7. AUTHORITATIVE RESPONSE
  ---------------------------------------------------------- */

  return json(
    res,
    201,
    {
      ok:
        true,

      service:
        "SPECIAL ALI",

      component:
        "INGESTION",

      execution_id:
        execution.id,

      upload_urls: [
        {
          url:
            signedUpload.signedUrl,

          path:
            storagePath,

          token:
            signedUpload.token
        }
      ],

      ingestion: {
        id:
          ingestionJob.id,

        data_object_id:
          dataObject.id,

        execution_id:
          execution.id,

        status:
          ingestionJob.status,

        current_stage:
          ingestionJob.current_stage,

        next_stage:
          "EXTRACTION",

        stages:
          STAGES,

        routing:
          ingestionJob.routing
      },

      data_object:
        dataObject
    }
  );
}

/* ============================================================
   GET
============================================================ */

async function handleGet(
  req: VercelRequest,
  res: VercelResponse
) {

  const {
    authorization
  } = await authorizeRequest(req);

  const workspaceId =
    authorization.identity.workspaceId;

  const rawId =
    req.query.id;

  if (
    typeof rawId === "string"
  ) {

    if (!isUuid(rawId)) {
      throw new HttpError(
        400,
        "INVALID_INGESTION_JOB_ID",
        "Invalid ingestion job id"
      );
    }

    const {
      data,
      error
    } =
      await supabaseAdmin
        .from("ingestion_jobs")
        .select(`
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
        `)
        .eq(
          "workspace_id",
          workspaceId
        )
        .eq(
          "id",
          rawId
        )
        .maybeSingle();

    if (error) {
      throw new HttpError(
        500,
        "INGESTION_JOB_QUERY_FAILED",
        "Unable to query ingestion job"
      );
    }

    if (!data) {
      throw new HttpError(
        404,
        "INGESTION_JOB_NOT_FOUND",
        "Ingestion job was not found"
      );
    }

    return json(
      res,
      200,
      {
        ok:
          true,

        service:
          "SPECIAL ALI",

        component:
          "INGESTION",

        ingestion:
          data
      }
    );
  }

  const rawLimit =
    typeof req.query.limit === "string"
      ? Number(req.query.limit)
      : 25;

  const limit =
    Number.isFinite(rawLimit)
      ? Math.min(
          Math.max(
            Math.floor(rawLimit),
            1
          ),
          100
        )
      : 25;

  const {
    data,
    error
  } =
    await supabaseAdmin
      .from("ingestion_jobs")
      .select(`
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
      `)
      .eq(
        "workspace_id",
        workspaceId
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      )
      .limit(
        limit
      );

  if (error) {
    throw new HttpError(
      500,
      "INGESTION_JOB_LIST_FAILED",
      "Unable to query ingestion jobs"
    );
  }

  return json(
    res,
    200,
    {
      ok:
        true,

      service:
        "SPECIAL ALI",

      component:
        "INGESTION",

      count:
        data?.length ?? 0,

      ingestion:
        data ?? []
    }
  );
}

/* ============================================================
   HANDLER
============================================================ */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {

  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {

    res.setHeader(
      "Allow",
      "GET, POST"
    );

    return res
      .status(405)
      .json({
        ok:
          false,

        error:
          "METHOD_NOT_ALLOWED"
      });
  }

  try {

    if (
      req.method === "POST"
    ) {

      return await handlePost(
        req,
        res
      );
    }

    return await handleGet(
      req,
      res
    );

  } catch (error) {

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

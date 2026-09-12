import {
  supabaseAdmin
} from "../../infrastructure/supabase/client.js";

import {
  HttpError
} from "../../shared/errors/http.js";

type JsonRecord =
  Record<string, unknown>;

interface ExecutionContext {
  executionId: string;
  tenantId: string;
  workspaceId: string;
  ingestionJobId: string;
  dataObjectId: string;
}

interface IngestionRow {
  id: string;
  tenant_id: string;
  workspace_id: string;
  data_object_id: string | null;
  source_name: string;
  status: string;
  current_stage: string;
  input_metadata: JsonRecord;
  extraction: JsonRecord;
  classification: JsonRecord;
  validation: JsonRecord;
  duplicate_detection: JsonRecord;
  evidence: JsonRecord;
  routing: JsonRecord;
}

interface DataObjectRow {
  id: string;
  tenant_id: string;
  workspace_id: string;
  object_type: string;
  status: string;
  name: string;
  mime_type: string | null;
  file_extension: string | null;
  size_bytes: number | null;
  content_hash: string | null;
  content_hash_algorithm: string | null;
  metadata: JsonRecord;
  provenance: JsonRecord;
  classification: JsonRecord;
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

function safeStorageName(
  value: string
): string {
  return value
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180);
}

function getExtension(
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

function inferDocumentType(
  object: DataObjectRow
): string {
  const mime =
    object.mime_type?.toLowerCase() ?? "";

  const extension =
    (
      object.file_extension ??
      getExtension(object.name) ??
      ""
    ).toLowerCase();

  const name =
    object.name.toLowerCase();

  if (
    mime === "application/pdf" ||
    extension === "pdf"
  ) {
    return "PDF_DOCUMENT";
  }

  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    extension === "xls" ||
    extension === "xlsx" ||
    extension === "csv"
  ) {
    return "SPREADSHEET";
  }

  if (
    mime.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "heic"]
      .includes(extension)
  ) {
    return "IMAGE_DOCUMENT";
  }

  if (
    mime.includes("word") ||
    extension === "doc" ||
    extension === "docx"
  ) {
    return "TEXT_DOCUMENT";
  }

  if (
    name.includes("invoice") ||
    name.includes("faktur") ||
    name.includes("nota")
  ) {
    return "FINANCIAL_DOCUMENT";
  }

  return "GENERAL_FILE";
}

function inferDomains(
  object: DataObjectRow
): string[] {
  const text = [
    object.name,
    object.mime_type ?? "",
    object.file_extension ?? ""
  ]
    .join(" ")
    .toLowerCase();

  const domains =
    new Set<string>();

  const accountingTerms = [
    "invoice",
    "faktur",
    "nota",
    "receipt",
    "kwitansi",
    "expense",
    "payment",
    "purchase",
    "sales",
    "journal",
    "accounting"
  ];

  const taxTerms = [
    "tax",
    "pajak",
    "ppn",
    "pph",
    "npwp",
    "faktur pajak",
    "efaktur"
  ];

  if (
    accountingTerms.some(
      (term) => text.includes(term)
    )
  ) {
    domains.add("ACCOUNTING");
  }

  if (
    taxTerms.some(
      (term) => text.includes(term)
    )
  ) {
    domains.add("TAX");
  }

  if (domains.size === 0) {
    domains.add("INVESTIGATE");
  }

  return Array.from(domains);
}

async function getContext(
  context: ExecutionContext
) {
  const {
    data: ingestion,
    error: ingestionError
  } =
    await supabaseAdmin
      .from("ingestion_jobs")
      .select("*")
      .eq(
        "id",
        context.ingestionJobId
      )
      .eq(
        "workspace_id",
        context.workspaceId
      )
      .single();

  if (
    ingestionError ||
    !ingestion
  ) {
    throw new HttpError(
      404,
      "INGESTION_JOB_NOT_FOUND",
      "Ingestion job was not found"
    );
  }

  const {
    data: dataObject,
    error: dataObjectError
  } =
    await supabaseAdmin
      .from("data_objects")
      .select("*")
      .eq(
        "id",
        context.dataObjectId
      )
      .eq(
        "workspace_id",
        context.workspaceId
      )
      .single();

  if (
    dataObjectError ||
    !dataObject
  ) {
    throw new HttpError(
      404,
      "DATA_OBJECT_NOT_FOUND",
      "Data object was not found"
    );
  }

  return {
    ingestion:
      ingestion as IngestionRow,

    dataObject:
      dataObject as DataObjectRow
  };
}

async function saveStage(
  context: ExecutionContext,
  stage: string,
  payload: JsonRecord
) {
  const now =
    new Date().toISOString();

  const {
    ingestion,
    dataObject
  } =
    await getContext(context);

  const ingestionUpdate: JsonRecord = {
    current_stage:
      stage,

    updated_at:
      now
  };

  if (stage === "EXTRACTION") {
    ingestionUpdate.extraction =
      payload;
  }

  if (stage === "CLASSIFICATION") {
    ingestionUpdate.classification =
      payload;
  }

  if (stage === "VALIDATION") {
    ingestionUpdate.validation =
      payload;
  }

  if (
    stage === "DUPLICATE_DETECTION"
  ) {
    ingestionUpdate.duplicate_detection =
      payload;
  }

  if (stage === "EVIDENCE") {
    ingestionUpdate.evidence =
      payload;
  }

  if (stage === "DATA_READY") {
    ingestionUpdate.routing =
      payload.routing ?? {};

    ingestionUpdate.status =
      "READY";

    ingestionUpdate.completed_at =
      now;
  }

  const {
    error: ingestionError
  } =
    await supabaseAdmin
      .from("ingestion_jobs")
      .update(
        ingestionUpdate
      )
      .eq(
        "id",
        ingestion.id
      )
      .eq(
        "workspace_id",
        context.workspaceId
      );

  if (ingestionError) {
    throw new HttpError(
      500,
      "INGESTION_STAGE_SAVE_FAILED",
      `Unable to save ${stage} stage`
    );
  }

  const metadata =
    {
      ...dataObject.metadata,
      special_ali_stage:
        stage,
      special_ali_stage_updated_at:
        now
    };

  const {
    error: objectError
  } =
    await supabaseAdmin
      .from("data_objects")
      .update({
        metadata,
        updated_at:
          now
      })
      .eq(
        "id",
        dataObject.id
      )
      .eq(
        "workspace_id",
        context.workspaceId
      );

  if (objectError) {
    throw new HttpError(
      500,
      "DATA_OBJECT_STAGE_SAVE_FAILED",
      `Unable to update data object for ${stage}`
    );
  }
}

const TXT_MAX_BYTES =
  4 * 1024 * 1024;

function isTxtFile(
  dataObject: DataObjectRow
): boolean {
  const extension =
    (
      dataObject.file_extension ??
      getExtension(dataObject.name) ??
      ""
    ).toLowerCase();

  const mime =
    (
      dataObject.mime_type ??
      ""
    ).toLowerCase();

  return (
    extension === "txt" ||
    mime === "text/plain"
  );
}

function normalizeFieldKey(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

function parseTextScalar(
  key: string,
  value: string
): unknown {
  const normalized =
    value.trim();

  if (!normalized) {
    return null;
  }

  const lowerKey =
    key.toLowerCase();

  const numericField =
    [
      "jumlah",
      "amount",
      "nominal",
      "harga",
      "total",
      "subtotal",
      "penjualan",
      "pembelian",
      "pendapatan",
      "pajak",
      "ppn",
      "pph",
      "debit",
      "kredit",
      "saldo",
      "nilai"
    ].some(
      (term) =>
        lowerKey.includes(term)
    );

  if (numericField) {
    const cleaned =
      normalized
        .replace(/rp/gi, "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(/,/g, ".");

    const numberValue =
      Number(cleaned);

    if (
      Number.isFinite(numberValue)
    ) {
      return numberValue;
    }
  }

  return normalized;
}

function parseTxtContent(
  text: string
): JsonRecord {
  const normalizedText =
    text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/^\uFEFF/, "");

  const lines =
    normalizedText.split("\n");

  const fields:
    Record<string, unknown> = {};

  const sourceSpans:
    Array<JsonRecord> = [];

  const records:
    Array<JsonRecord> = [];

  let keyValueCount = 0;

  for (
    let index = 0;
    index < lines.length;
    index++
  ) {
    const rawLine =
      lines[index];

    const line =
      rawLine.trim();

    if (!line) {
      continue;
    }

    /*
      Format yang didukung:

      Nama: Toko Kopi Bos
      Nama = Toko Kopi Bos
    */

    const match =
      line.match(
        /^([^:=]{1,120})\s*[:=]\s*(.+)$/
      );

    if (!match) {
      continue;
    }

    const rawKey =
      match[1].trim();

    const rawValue =
      match[2].trim();

    if (
      !rawKey ||
      !rawValue
    ) {
      continue;
    }

    const key =
      normalizeFieldKey(
        rawKey
      );

    if (!key) {
      continue;
    }

    const value =
      parseTextScalar(
        key,
        rawValue
      );

    fields[key] =
      value;

    sourceSpans.push({
      field: key,
      source_line:
        index + 1,
      source_text:
        rawLine
    });

    keyValueCount++;
  }

  /*
    Dukungan sederhana untuk
    data berbentuk tabel:

    Tanggal | Nama | Total
    10/09/2026 | Toko | 1500000
  */

  const tableLines =
    lines
      .map(
        (line, index) => ({
          line:
            line.trim(),
          lineNumber:
            index + 1
        })
      )
      .filter(
        ({ line }) =>
          line.includes("|")
      );

  if (
    tableLines.length >= 2
  ) {
    const headers =
      tableLines[0].line
        .split("|")
        .map(
          (value) =>
            normalizeFieldKey(value)
        )
        .filter(Boolean);

    if (
      headers.length > 0
    ) {
      for (
        let i = 1;
        i < tableLines.length;
        i++
      ) {
        const values =
          tableLines[i].line
            .split("|")
            .map(
              (value) =>
                value.trim()
            );

        if (
          values.length !==
          headers.length
        ) {
          continue;
        }

        const record:
          Record<string, unknown> = {};

        headers.forEach(
          (header, columnIndex) => {
            record[header] =
              parseTextScalar(
                header,
                values[columnIndex]
              );
          }
        );

        records.push(record);
      }
    }
  }

  const preview =
    normalizedText.length > 4000
      ? normalizedText.slice(
          0,
          4000
        ) + "\n...[PREVIEW_TRUNCATED]"
      : normalizedText;

  return {
    parser:
      "SPECIAL_ALI_TXT_PARSER_V0.1",

    schema:
      keyValueCount > 0
        ? "KEY_VALUE"
        : records.length > 0
          ? "TABLE"
          : "PLAIN_TEXT",

    fields,

    records,

    source_spans:
      sourceSpans,

    line_count:
      lines.length,

    character_count:
      normalizedText.length,

    raw_text_preview:
      preview
  };
}

async function readTxtFromStorage(
  storagePath: string
): Promise<{
  text: string;
  sizeBytes: number;
}> {
  const {
    data,
    error
  } =
    await supabaseAdmin
      .storage
      .from("evidence")
      .download(
        storagePath
      );

  if (
    error ||
    !data
  ) {
    throw new HttpError(
      500,
      "TXT_STORAGE_READ_FAILED",
      error?.message ??
        "Unable to read TXT from evidence storage"
    );
  }

  const buffer =
    await data.arrayBuffer();

  if (
    buffer.byteLength >
    TXT_MAX_BYTES
  ) {
    throw new HttpError(
      422,
      "TXT_FILE_TOO_LARGE",
      "TXT file exceeds the v0.1 extraction limit of 4 MB"
    );
  }

  const decoder =
    new TextDecoder(
      "utf-8",
      {
        fatal: false
      }
    );

  const text =
    decoder.decode(buffer);

  return {
    text,
    sizeBytes:
      buffer.byteLength
  };
}

async function processExtraction(
  context: ExecutionContext
) {
  const {
    ingestion,
    dataObject
  } =
    await getContext(context);

  const extension =
    dataObject.file_extension ??
    getExtension(
      dataObject.name
    );

  const storagePath =
    [
      context.workspaceId,
      context.dataObjectId,
      safeStorageName(
        dataObject.name
      )
    ].join("/");

  const payload: JsonRecord = {
    engine:
      "SPECIAL_ALI_METADATA_EXTRACTOR_V0.1",

    mode:
      "METADATA_ONLY",

    source_name:
      ingestion.source_name,

    mime_type:
      dataObject.mime_type,

    file_extension:
      extension,

    size_bytes:
      dataObject.size_bytes,

    content_hash:
      dataObject.content_hash,

    content_hash_algorithm:
      dataObject.content_hash_algorithm,

    storage_path:
      storagePath,

    extracted_at:
      new Date().toISOString(),

    content_read:
      false,

    note:
      "Binary/OCR content extraction is not enabled in v0.1. Metadata and source registration completed."
  };

  await saveStage(
    context,
    "EXTRACTION",
    payload
  );

  return payload;
}

async function processClassification(
  context: ExecutionContext
) {
  const {
    dataObject
  } =
    await getContext(context);

  const documentType =
    inferDocumentType(
      dataObject
    );

  const domains =
    inferDomains(
      dataObject
    );

  const payload: JsonRecord = {
    engine:
      "SPECIAL_ALI_CLASSIFIER_V0.1",

    document_type:
      documentType,

    object_type:
      dataObject.object_type,

    domains,

    confidence:
      domains.includes("INVESTIGATE")
        ? 0.50
        : 0.80,

    basis: [
      "file_name",
      "mime_type",
      "file_extension"
    ],

    classified_at:
      new Date().toISOString()
  };

  const {
    error
  } =
    await supabaseAdmin
      .from("data_objects")
      .update({
        classification:
          payload,

        metadata: {
          ...dataObject.metadata,
          classification_engine:
            "SPECIAL_ALI_CLASSIFIER_V0.1"
        },

        updated_at:
          new Date().toISOString()
      })
      .eq(
        "id",
        dataObject.id
      )
      .eq(
        "workspace_id",
        context.workspaceId
      );

  if (error) {
    throw new HttpError(
      500,
      "CLASSIFICATION_SAVE_FAILED",
      "Unable to save classification"
    );
  }

  await saveStage(
    context,
    "CLASSIFICATION",
    payload
  );

  return payload;
}

async function processValidation(
  context: ExecutionContext
) {
  const {
    dataObject
  } =
    await getContext(context);

  const checks = {
    name_present:
      normalizeString(
        dataObject.name
      ) !== null,

    workspace_present:
      Boolean(
        dataObject.workspace_id
      ),

    tenant_present:
      Boolean(
        dataObject.tenant_id
      ),

    object_type_present:
      normalizeString(
        dataObject.object_type
      ) !== null,

    source_registered:
      Boolean(
        dataObject.provenance
      ),

    size_valid:
      dataObject.size_bytes === null ||
      dataObject.size_bytes >= 0
  };

  const failedChecks =
    Object.entries(checks)
      .filter(
        ([, passed]) => !passed
      )
      .map(
        ([name]) => name
      );

  const valid =
    failedChecks.length === 0;

  const payload: JsonRecord = {
    engine:
      "SPECIAL_ALI_VALIDATOR_V0.1",

    valid,

    checks,

    failed_checks:
      failedChecks,

    validated_at:
      new Date().toISOString(),

    severity:
      valid
        ? "NONE"
        : "BLOCKING"
  };

  if (!valid) {
    throw new HttpError(
      422,
      "DATA_VALIDATION_FAILED",
      `Validation failed: ${failedChecks.join(", ")}`
    );
  }

  await saveStage(
    context,
    "VALIDATION",
    payload
  );

  return payload;
}

async function processDuplicateDetection(
  context: ExecutionContext
) {
  const {
    dataObject
  } =
    await getContext(context);

  if (!dataObject.content_hash) {
    const payload: JsonRecord = {
      engine:
        "SPECIAL_ALI_DUPLICATE_DETECTOR_V0.1",

      checked:
        false,

      duplicate:
        false,

      reason:
        "CONTENT_HASH_NOT_AVAILABLE",

      detected_at:
        new Date().toISOString()
    };

    await saveStage(
      context,
      "DUPLICATE_DETECTION",
      payload
    );

    return payload;
  }

  const {
    data: matches,
    error
  } =
    await supabaseAdmin
      .from("data_objects")
      .select(
        "id, name, status, created_at"
      )
      .eq(
        "workspace_id",
        context.workspaceId
      )
      .eq(
        "content_hash",
        dataObject.content_hash
      )
      .neq(
        "id",
        dataObject.id
      )
      .limit(10);

  if (error) {
    throw new HttpError(
      500,
      "DUPLICATE_CHECK_FAILED",
      "Unable to perform duplicate detection"
    );
  }

  const duplicate =
    (matches?.length ?? 0) > 0;

  const payload: JsonRecord = {
    engine:
      "SPECIAL_ALI_DUPLICATE_DETECTOR_V0.1",

    checked:
      true,

    duplicate,

    match_count:
      matches?.length ?? 0,

    matches:
      matches ?? [],

    content_hash:
      dataObject.content_hash,

    detected_at:
      new Date().toISOString()
  };

  await saveStage(
    context,
    "DUPLICATE_DETECTION",
    payload
  );

  return payload;
}

async function processEvidence(
  context: ExecutionContext
) {
  const {
    dataObject
  } =
    await getContext(context);

  const storagePath =
    [
      context.workspaceId,
      context.dataObjectId,
      safeStorageName(
        dataObject.name
      )
    ].join("/");

  const payload: JsonRecord = {
    engine:
      "SPECIAL_ALI_EVIDENCE_REGISTRY_V0.1",

    registered:
      true,

    bucket:
      "evidence",

    storage_path:
      storagePath,

    data_object_id:
      dataObject.id,

    ingestion_job_id:
      context.ingestionJobId,

    evidence_type:
      "SOURCE_FILE",

    registered_at:
      new Date().toISOString()
  };

  await saveStage(
    context,
    "EVIDENCE",
    payload
  );

  return payload;
}

async function processDataReady(
  context: ExecutionContext
) {
  const {
    ingestion,
    dataObject
  } =
    await getContext(context);

  const classification =
    ingestion.classification;

  const domains =
    Array.isArray(
      classification.domains
    )
      ? classification.domains as string[]
      : ["INVESTIGATE"];

  let selected:
    string | null = null;

  if (
    domains.includes("ACCOUNTING") &&
    domains.includes("TAX")
  ) {
    selected = "BOTH";
  } else if (
    domains.includes("ACCOUNTING")
  ) {
    selected = "ACCOUNTING";
  } else if (
    domains.includes("TAX")
  ) {
    selected = "TAX";
  } else {
    selected = "INVESTIGATE";
  }

  const payload: JsonRecord = {
    ready:
      true,

    data_object_id:
      dataObject.id,

    routing: {
      available:
        true,

      selected,

      options: [
        "ACCOUNTING",
        "TAX",
        "BOTH",
        "INVESTIGATE"
      ],

      reason:
        "Controlled routing based on classification. Accounting and Tax interpretations remain separate."
    },

    ready_at:
      new Date().toISOString()
  };

  await saveStage(
    context,
    "DATA_READY",
    payload
  );

  const {
    error
  } =
    await supabaseAdmin
      .from("data_objects")
      .update({
        status:
          "READY",

        updated_at:
          new Date().toISOString()
      })
      .eq(
        "id",
        dataObject.id
      )
      .eq(
        "workspace_id",
        context.workspaceId
      );

  if (error) {
    throw new HttpError(
      500,
      "DATA_READY_UPDATE_FAILED",
      "Unable to mark data object as READY"
    );
  }

  return payload;
}

export async function processExecutionStage(
  context: ExecutionContext,
  stage: string
): Promise<JsonRecord> {

  switch (stage) {

    case "DATA_RECEIVED":
      return {
        acknowledged:
          true,

        received_at:
          new Date().toISOString()
      };

    case "EXTRACTION":
      return processExtraction(
        context
      );

    case "CLASSIFICATION":
      return processClassification(
        context
      );

    case "VALIDATION":
      return processValidation(
        context
      );

    case "DUPLICATE_DETECTION":
      return processDuplicateDetection(
        context
      );

    case "EVIDENCE":
      return processEvidence(
        context
      );

    case "DATA_READY":
      return processDataReady(
        context
      );

    default:
      throw new HttpError(
        400,
        "UNSUPPORTED_EXECUTION_STAGE",
        `Unsupported execution stage: ${stage}`
      );
  }
}

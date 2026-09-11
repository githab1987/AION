import { supabaseAdmin } from "../../infrastructure/supabase/client.js";
import { HttpError } from "../../shared/errors/http.js";
import type { AuthorizationContext } from "../authorization/types.js";

const DATA_ACCESS_ACTIONS = [
  "READ",
  "WRITE",
  "DOWNLOAD",
  "EXPORT",
  "SHARE",
  "DELETE",
  "CLASSIFY",
  "VALIDATE"
] as const;

type DataAccessAction =
  (typeof DATA_ACCESS_ACTIONS)[number];

function isDataAccessAction(
  value: string
): value is DataAccessAction {
  return DATA_ACCESS_ACTIONS.includes(
    value as DataAccessAction
  );
}

export async function authorizeDataObjectAccess(
  authorization: AuthorizationContext,
  dataObjectId: string,
  action: DataAccessAction
): Promise<void> {

  if (!isDataAccessAction(action)) {
    throw new HttpError(
      400,
      "INVALID_DATA_ACCESS_ACTION",
      "Invalid data access action"
    );
  }

  const { data: object, error: objectError } =
    await supabaseAdmin
      .from("data_objects")
      .select(`
        id,
        tenant_id,
        workspace_id,
        status
      `)
      .eq("id", dataObjectId)
      .maybeSingle();

  if (objectError || !object) {
    throw new HttpError(
      404,
      "DATA_OBJECT_NOT_FOUND",
      "Data object was not found"
    );
  }

  if (
    object.tenant_id !==
    authorization.identity.tenantId
  ) {
    throw new HttpError(
      403,
      "DATA_OBJECT_ACCESS_DENIED",
      "Data object tenant access denied"
    );
  }

  if (
    object.workspace_id !==
    authorization.identity.workspaceId
  ) {
    throw new HttpError(
      403,
      "DATA_OBJECT_ACCESS_DENIED",
      "Data object workspace access denied"
    );
  }

  const { data: classifications } =
    await supabaseAdmin
      .from("data_classifications")
      .select("classification_level")
      .eq("data_object_id", dataObjectId)
      .limit(1);

  const classificationLevel =
    classifications?.[0]?.classification_level ?? null;

  const role = authorization.roles[0] ?? null;

  const now = new Date().toISOString();

  const { data: policies, error: policyError } =
    await supabaseAdmin
      .from("data_access_policies")
      .select(`
        id,
        data_object_id,
        classification_level,
        workspace_role,
        action,
        allow_access,
        requires_human_gate,
        requires_reason,
        status,
        effective_at,
        expires_at
      `)
      .eq("workspace_id", object.workspace_id)
      .eq("action", action)
      .eq("status", "ACTIVE")
      .lte("effective_at", now);

  if (policyError) {
    throw new HttpError(
      500,
      "DATA_ACCESS_POLICY_LOOKUP_FAILED",
      "Unable to evaluate data access policy"
    );
  }

  const applicablePolicies =
    (policies ?? []).filter((policy) => {

      if (
        policy.expires_at &&
        policy.expires_at <= now
      ) {
        return false;
      }

      const objectMatch =
        policy.data_object_id === null ||
        policy.data_object_id === object.id;

      const classificationMatch =
        policy.classification_level === null ||
        policy.classification_level ===
          classificationLevel;

      const roleMatch =
        policy.workspace_role === null ||
        policy.workspace_role === role;

      return (
        objectMatch &&
        classificationMatch &&
        roleMatch
      );
    });

  if (applicablePolicies.length === 0) {
    throw new HttpError(
      403,
      "DATA_ACCESS_DENIED",
      "No active data access policy permits this action"
    );
  }

  const denyPolicy =
    applicablePolicies.find(
      (policy) => policy.allow_access === false
    );

  if (denyPolicy) {
    throw new HttpError(
      403,
      "DATA_ACCESS_DENIED",
      "Data access was explicitly denied by policy"
    );
  }

  const humanGateRequired =
    applicablePolicies.some(
      (policy) => policy.requires_human_gate
    );

  if (humanGateRequired) {
    throw new HttpError(
      403,
      "HUMAN_GATE_REQUIRED",
      "This data action requires human authorization"
    );
  }

  const allowed =
    applicablePolicies.some(
      (policy) => policy.allow_access === true
    );

  if (!allowed) {
    throw new HttpError(
      403,
      "DATA_ACCESS_DENIED",
      "Data access was not explicitly permitted"
    );
  }
}

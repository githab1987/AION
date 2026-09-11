import type { VercelRequest } from "@vercel/node";
import { supabaseAdmin } from "../../infrastructure/supabase/client.js";
import { HttpError } from "../../shared/errors/http.js";
import type {
  ActorType,
  AuthenticationMethod,
  AuthorizationContext,
  RequestIdentity
} from "./types.js";

const WORKSPACE_ROLES = [
  "OWNER",
  "ADMIN",
  "ACCOUNTANT",
  "TAX",
  "AUDITOR",
  "ANALYST",
  "VIEWER"
] as const;

type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export interface AuthorizedRequest {
  authorization: AuthorizationContext;
}

function getBearerToken(req: VercelRequest): string {
  const header = req.headers.authorization;

  if (!header) {
    throw new HttpError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authorization header is required"
    );
  }

  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new HttpError(
      401,
      "INVALID_AUTHORIZATION_HEADER",
      "Bearer token is required"
    );
  }

  return match[1];
}

function getWorkspaceId(req: VercelRequest): string {
  const value = req.headers["x-workspace-id"];

  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(
      400,
      "WORKSPACE_REQUIRED",
      "X-Workspace-Id header is required"
    );
  }

  return value;
}

function isWorkspaceRole(value: string): value is WorkspaceRole {
  return WORKSPACE_ROLES.includes(value as WorkspaceRole);
}

export async function authorizeRequest(
  req: VercelRequest
): Promise<AuthorizedRequest> {
  const token = getBearerToken(req);
  const workspaceId = getWorkspaceId(req);

  const {
    data: { user },
    error: userError
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    throw new HttpError(
      401,
      "INVALID_AUTHENTICATION",
      "Authentication token is invalid"
    );
  }

  const { data: workspace, error: workspaceError } =
    await supabaseAdmin
      .from("workspaces")
      .select("id, tenant_id, is_active")
      .eq("id", workspaceId)
      .maybeSingle();

  if (workspaceError || !workspace) {
    throw new HttpError(
      404,
      "WORKSPACE_NOT_FOUND",
      "Workspace was not found"
    );
  }

  if (!workspace.is_active) {
    throw new HttpError(
      403,
      "WORKSPACE_INACTIVE",
      "Workspace is inactive"
    );
  }

  const { data: membership, error: membershipError } =
    await supabaseAdmin
      .from("workspace_members")
      .select("role, is_active")
      .eq("workspace_id", workspace.id)
      .eq("user_id", user.id)
      .maybeSingle();

  if (membershipError || !membership) {
    throw new HttpError(
      403,
      "WORKSPACE_ACCESS_DENIED",
      "User is not a member of this workspace"
    );
  }

  if (!membership.is_active) {
    throw new HttpError(
      403,
      "MEMBERSHIP_INACTIVE",
      "Workspace membership is inactive"
    );
  }

  if (!isWorkspaceRole(membership.role)) {
    throw new HttpError(
      403,
      "ROLE_NOT_AUTHORIZED",
      "Workspace role is not authorized"
    );
  }

  const identity: RequestIdentity = {
    userId: user.id,
    tenantId: workspace.tenant_id,
    workspaceId: workspace.id,
    actorType: "USER" as ActorType,
    authenticationMethod:
      "SUPABASE_AUTH" as AuthenticationMethod,
    requestId:
      typeof req.headers["x-request-id"] === "string"
        ? req.headers["x-request-id"]
        : crypto.randomUUID()
  };

  const authorization: AuthorizationContext = {
    identity,
    roles: [membership.role],
    permissions: []
  };

  return {
    authorization
  };
}

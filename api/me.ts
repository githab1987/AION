import type { VercelRequest, VercelResponse } from "@vercel/node";

import { supabaseAdmin } from "../infrastructure/supabase/client.js";
import { authorizeRequest } from "../core/authorization/middleware.js";

function sendError(
  res: VercelResponse,
  status: number,
  error: string,
  message: string
) {
  return res.status(status).json({
    ok: false,
    error,
    message
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return sendError(
      res,
      405,
      "METHOD_NOT_ALLOWED",
      "Method not allowed"
    );
  }

  try {
    /*
     * AUTHORIZATION
     *
     * This is the single authoritative authentication
     * and workspace-membership gate.
     */
    const { authorization } =
      await authorizeRequest(req);

    const {
      userId,
      tenantId,
      workspaceId
    } = authorization.identity;

    /*
     * USER
     *
     * We obtain the authenticated user from Supabase Auth
     * using the bearer token already validated by middleware.
     */
    const authorizationHeader =
      req.headers.authorization;

    const token =
      typeof authorizationHeader === "string"
        ? authorizationHeader.replace(/^Bearer\s+/i, "").trim()
        : "";

    const {
      data: {
        user
      },
      error: userError
    } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return sendError(
        res,
        401,
        "INVALID_AUTHENTICATION",
        "Authentication token is invalid"
      );
    }

    /*
     * Defensive identity consistency check.
     */
    if (user.id !== userId) {
      return sendError(
        res,
        403,
        "IDENTITY_MISMATCH",
        "Authenticated identity mismatch"
      );
    }

    /*
     * WORKSPACE
     *
     * Read only the fields already proven to exist
     * from authorization middleware.
     */
    const {
      data: workspace,
      error: workspaceError
    } =
      await supabaseAdmin
        .from("workspaces")
        .select(
          "id, tenant_id, is_active"
        )
        .eq(
          "id",
          workspaceId
        )
        .maybeSingle();

    if (workspaceError) {
      console.error(
        "/api/me workspace lookup failed",
        workspaceError
      );

      return sendError(
        res,
        500,
        "WORKSPACE_LOOKUP_FAILED",
        "Unable to load workspace"
      );
    }

    if (!workspace) {
      return sendError(
        res,
        404,
        "WORKSPACE_NOT_FOUND",
        "Workspace was not found"
      );
    }

    /*
     * Defensive tenant consistency check.
     */
    if (workspace.tenant_id !== tenantId) {
      console.error(
        "/api/me tenant mismatch",
        {
          authorizationTenantId: tenantId,
          workspaceTenantId: workspace.tenant_id,
          workspaceId
        }
      );

      return sendError(
        res,
        403,
        "TENANT_MISMATCH",
        "Workspace tenant mismatch"
      );
    }

    /*
     * MEMBERSHIP
     *
     * The exact table and columns are already established
     * by the authorization middleware.
     */
    const {
      data: membership,
      error: membershipError
    } =
      await supabaseAdmin
        .from("workspace_members")
        .select(
          "role, is_active"
        )
        .eq(
          "workspace_id",
          workspaceId
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (membershipError) {
      console.error(
        "/api/me membership lookup failed",
        membershipError
      );

      return sendError(
        res,
        500,
        "MEMBERSHIP_LOOKUP_FAILED",
        "Unable to load workspace membership"
      );
    }

    if (!membership) {
      return sendError(
        res,
        403,
        "WORKSPACE_ACCESS_DENIED",
        "User is not a member of this workspace"
      );
    }

    /*
     * IMPORTANT:
     *
     * Do not query "profiles" yet.
     *
     * Its schema has not been verified from the repository
     * or the actual Supabase database.
     *
     * Returning the authenticated Supabase user is enough
     * to establish the /me contract without inventing schema.
     */

    return res.status(200).json({
      ok: true,

      data: {
        user: {
          id: user.id,
          email: user.email ?? null
        },

        workspace,

        membership,

        authorization: {
          tenantId,
          workspaceId,
          userId,
          roles: authorization.roles,
          permissions: authorization.permissions
        }
      }
    });
  } catch (error: any) {
    console.error(
      "/api/me failed",
      error
    );

    const status =
      Number(error?.status) || 500;

    const code =
      typeof error?.code === "string"
        ? error.code
        : "INTERNAL_SERVER_ERROR";

    const message =
      status >= 500
        ? "Unable to load authenticated context"
        : (
            typeof error?.message === "string"
              ? error.message
              : "Request failed"
          );

    return sendError(
      res,
      status,
      code,
      message
    );
  }
}

import type { VercelRequest, VercelResponse } from "@vercel/node";

import { supabaseAdmin } from "../infrastructure/supabase/client.js";

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

const ALLOWED_ROLES = new Set([
  "OWNER",
  "ADMIN",
  "ACCOUNTANT",
  "TAX",
  "AUDITOR",
  "ANALYST",
  "VIEWER"
]);

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
     * BOOTSTRAP AUTHENTICATION
     *
     * /me is intentionally NOT workspace-authorized.
     *
     * At this point the frontend may know the authenticated
     * user but not yet know which workspace must be sent in
     * X-Workspace-Id.
     *
     * Therefore this endpoint establishes the initial
     * authenticated workspace context.
     */

    const authorizationHeader =
      req.headers.authorization;

    if (
      typeof authorizationHeader !== "string"
    ) {
      return sendError(
        res,
        401,
        "AUTHENTICATION_REQUIRED",
        "Authorization header is required"
      );
    }

    const match =
      authorizationHeader.match(
        /^Bearer\s+(.+)$/i
      );

    if (!match) {
      return sendError(
        res,
        401,
        "INVALID_AUTHORIZATION_HEADER",
        "Authorization header must use Bearer authentication"
      );
    }

    const token =
      match[1].trim();

    if (!token) {
      return sendError(
        res,
        401,
        "INVALID_AUTHORIZATION_HEADER",
        "Bearer token is required"
      );
    }


    /*
     * SUPABASE AUTH
     *
     * Supabase Auth is the authoritative
     * identity source.
     */

    const {
      data: {
        user
      },
      error: userError
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (
      userError ||
      !user
    ) {
      return sendError(
        res,
        401,
        "INVALID_AUTHENTICATION",
        "Authentication token is invalid"
      );
    }


    /*
     * WORKSPACE MEMBERSHIP
     *
     * Discover an active workspace from
     * the authenticated user.
     *
     * No X-Workspace-Id is required here.
     */

    const {
      data: memberships,
      error: membershipError
    } =
      await supabaseAdmin
        .from("workspace_members")
        .select(
          "workspace_id, role, is_active, created_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "is_active",
          true
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );

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

    if (
      !memberships ||
      memberships.length === 0
    ) {
      return sendError(
        res,
        403,
        "WORKSPACE_ACCESS_DENIED",
        "User has no active workspace membership"
      );
    }


    /*
     * SELECT ACTIVE AUTHORIZED WORKSPACE
     *
     * We do not assume a profile column or
     * default-workspace column that has not
     * been verified.
     */

    let selectedWorkspace: {
      id: string;
      tenant_id: string;
      name: string;
      slug: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    } | null = null;

    let selectedMembership: {
      workspace_id: string;
      role: string;
      is_active: boolean;
      created_at: string;
    } | null = null;


    for (
      const membership of memberships
    ) {

      const {
        data: workspace,
        error: workspaceError
      } =
        await supabaseAdmin
          .from("workspaces")
          .select(
            "id, tenant_id, name, slug, is_active, created_at, updated_at"
          )
          .eq(
            "id",
            membership.workspace_id
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

      if (
        !workspace ||
        !workspace.is_active
      ) {
        continue;
      }

      if (
        !ALLOWED_ROLES.has(
          membership.role
        )
      ) {
        continue;
      }

      selectedWorkspace =
        workspace;

      selectedMembership =
        membership;

      break;
    }


    if (
      !selectedWorkspace ||
      !selectedMembership
    ) {
      return sendError(
        res,
        403,
        "WORKSPACE_ACCESS_DENIED",
        "User has no active authorized workspace"
      );
    }


    /*
     * BOOTSTRAP RESPONSE
     *
     * Frontend can now store workspace.id
     * and send X-Workspace-Id on all
     * subsequent protected requests.
     */

    return res.status(200).json({

      ok: true,

      data: {

        user: {
          id: user.id,
          email:
            user.email ?? null
        },

        workspace:
          selectedWorkspace,

        membership: {
          workspace_id:
            selectedMembership.workspace_id,

          role:
            selectedMembership.role,

          is_active:
            selectedMembership.is_active
        },

        authorization: {

          tenantId:
            selectedWorkspace.tenant_id,

          workspaceId:
            selectedWorkspace.id,

          userId:
            user.id,

          roles: [
            selectedMembership.role
          ],

          permissions: []
        }
      }
    });

  } catch (error: any) {

    console.error(
      "/api/me failed",
      error
    );

    return sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to load authenticated context"
    );
  }
}

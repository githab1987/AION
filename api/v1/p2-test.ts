import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authorizeRequest } from "../../core/authorization/middleware.js";
import { supabaseAdmin } from "../../infrastructure/supabase/client.js";

type TestStatus = "PASS" | "FAIL" | "SKIPPED";

interface TestResult {
  id: string;
  expected: string;
  actual: string;
  status: TestStatus;
  note?: string;
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

function getHeader(
  req: VercelRequest,
  name: string
): string | undefined {
  const value = req.headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
  };

  if (typeof candidate.status === "number") {
    return candidate.status;
  }

  if (typeof candidate.statusCode === "number") {
    return candidate.statusCode;
  }

  return undefined;
}

function syntheticRequest(
  authorization?: string,
  workspaceId?: string
): VercelRequest {
  const headers: Record<string, string> = {};

  if (authorization !== undefined) {
    headers.authorization = authorization;
  }

  if (workspaceId !== undefined) {
    headers["x-workspace-id"] = workspaceId;
  }

  return {
    headers
  } as VercelRequest;
}

async function expectDenied(
  id: string,
  req: VercelRequest,
  expectedStatus: number
): Promise<TestResult> {
  try {
    await authorizeRequest(req);

    return {
      id,
      expected: String(expectedStatus),
      actual: "AUTHORIZED",
      status: "FAIL",
      note: "Request was unexpectedly authorized."
    };
  } catch (error) {
    const actualStatus = getErrorStatus(error);

    return {
      id,
      expected: String(expectedStatus),
      actual:
        actualStatus !== undefined
          ? String(actualStatus)
          : "UNKNOWN",
      status:
        actualStatus === expectedStatus
          ? "PASS"
          : "FAIL"
    };
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  /*
   * Bootstrap:
   *
   * The caller must already be authenticated and authorized.
   * The access token is used only inside this server process.
   *
   * The token is NEVER:
   * - returned
   * - logged
   * - stored
   * - included in test results
   */
  let current;

  try {
    current = await authorizeRequest(req);
  } catch {
    return res.status(401).json({
      ok: false,
      error: "AUTHENTICATION_REQUIRED",
      message:
        "A valid authenticated session is required to run P2 tests."
    });
  }

  const authorization = current.authorization;

  const userId = authorization.identity.userId;
  const workspaceId = authorization.identity.workspaceId;
  const role = authorization.roles[0] ?? null;

  const token = getHeader(req, "authorization");
  const incomingWorkspaceId = getHeader(
    req,
    "x-workspace-id"
  );

  if (!token || !incomingWorkspaceId) {
    return res.status(400).json({
      ok: false,
      error: "P2_BOOTSTRAP_HEADERS_MISSING"
    });
  }

  const results: TestResult[] = [];

  /*
   * AUTH-001
   * No Authorization header
   */
  results.push(
    await expectDenied(
      "AUTH-001",
      syntheticRequest(
        undefined,
        workspaceId
      ),
      401
    )
  );

  /*
   * AUTH-002
   * Malformed Authorization header
   */
  results.push(
    await expectDenied(
      "AUTH-002",
      syntheticRequest(
        "NotBearerToken",
        workspaceId
      ),
      401
    )
  );

  /*
   * AUTH-003
   * Valid authentication + valid workspace
   */
  try {
    await authorizeRequest(
      syntheticRequest(
        token,
        workspaceId
      )
    );

    results.push({
      id: "AUTH-003",
      expected: "AUTHORIZED",
      actual: "AUTHORIZED",
      status: "PASS",
      note:
        "Authenticated request continued through authorization middleware."
    });
  } catch {
    results.push({
      id: "AUTH-003",
      expected: "AUTHORIZED",
      actual: "DENIED",
      status: "FAIL"
    });
  }

  /*
   * AUTH-004
   * No workspace header
   */
  results.push(
    await expectDenied(
      "AUTH-004",
      syntheticRequest(token),
      400
    )
  );

  /*
   * AUTH-005
   * Invalid workspace UUID
   */
  results.push(
    await expectDenied(
      "AUTH-005",
      syntheticRequest(
        token,
        "not-a-uuid"
      ),
      400
    )
  );

  /*
   * AUTH-006
   * Valid UUID but nonexistent workspace
   */
  const nonexistentWorkspace =
    "00000000-0000-0000-0000-000000000000";

  results.push(
    await expectDenied(
      "AUTH-006",
      syntheticRequest(
        token,
        nonexistentWorkspace
      ),
      404
    )
  );

  /*
   * Safe fixture discovery.
   *
   * Nothing is inserted, updated, deleted, or mutated.
   */
  let inactiveWorkspaceId:
    | string
    | undefined;

  let nonMemberWorkspaceId:
    | string
    | undefined;

  let inactiveMembershipWorkspaceId:
    | string
    | undefined;

  try {
    /*
     * Find an inactive workspace.
     */
    const {
      data: inactiveWorkspaces
    } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("is_active", false)
      .limit(1);

    inactiveWorkspaceId =
      inactiveWorkspaces?.[0]?.id;

    /*
     * Find active workspaces other than current workspace.
     */
    const {
      data: activeWorkspaces
    } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("is_active", true)
      .neq("id", workspaceId)
      .limit(50);

    const candidateWorkspaceIds =
      (activeWorkspaces ?? [])
        .map((row) => row.id)
        .filter(
          (id): id is string =>
            typeof id === "string"
        );

    /*
     * Find current user's active memberships.
     */
    const {
      data: activeMemberships
    } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .in(
        "workspace_id",
        candidateWorkspaceIds.length > 0
          ? candidateWorkspaceIds
          : ["00000000-0000-0000-0000-000000000000"]
      );

    const memberWorkspaceIds =
      new Set(
        (activeMemberships ?? [])
          .map(
            (row) => row.workspace_id
          )
          .filter(
            (id): id is string =>
              typeof id === "string"
          )
      );

    /*
     * Active workspace where user is NOT a member.
     */
    nonMemberWorkspaceId =
      candidateWorkspaceIds.find(
        (id) =>
          !memberWorkspaceIds.has(id)
      );

    /*
     * Find inactive membership for this user.
     */
    const {
      data: inactiveMemberships
    } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("is_active", false)
      .limit(1);

    inactiveMembershipWorkspaceId =
      inactiveMemberships?.[0]?.workspace_id;
  } catch {
    /*
     * Fixture discovery failure is intentionally silent.
     * No database error is exposed to the client.
     */
  }

  /*
   * AUTH-007
   * Inactive workspace
   */
  if (inactiveWorkspaceId) {
    results.push(
      await expectDenied(
        "AUTH-007",
        syntheticRequest(
          token,
          inactiveWorkspaceId
        ),
        403
      )
    );
  } else {
    results.push({
      id: "AUTH-007",
      expected: "403",
      actual: "NO_FIXTURE",
      status: "SKIPPED",
      note:
        "No inactive workspace fixture is available."
    });
  }

  /*
   * AUTH-008
   * Active workspace where current user is not a member
   */
  if (nonMemberWorkspaceId) {
    results.push(
      await expectDenied(
        "AUTH-008",
        syntheticRequest(
          token,
          nonMemberWorkspaceId
        ),
        403
      )
    );
  } else {
    results.push({
      id: "AUTH-008",
      expected: "403",
      actual: "NO_FIXTURE",
      status: "SKIPPED",
      note:
        "No active non-member workspace fixture is available."
    });
  }

  /*
   * AUTH-009
   * Inactive membership
   */
  if (inactiveMembershipWorkspaceId) {
    results.push(
      await expectDenied(
        "AUTH-009",
        syntheticRequest(
          token,
          inactiveMembershipWorkspaceId
        ),
        403
      )
    );
  } else {
    results.push({
      id: "AUTH-009",
      expected: "403",
      actual: "NO_FIXTURE",
      status: "SKIPPED",
      note:
        "No inactive membership fixture is available."
    });
  }

  /*
   * AUTH-010
   * Invalid role
   *
   * We deliberately DO NOT mutate production data
   * merely to manufacture an invalid role.
   */
  try {
    const {
      data: memberships
    } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .limit(100);

    const invalidRole =
      (memberships ?? [])
        .map((row) => row.role)
        .find(
          (candidate) =>
            typeof candidate === "string" &&
            !ALLOWED_ROLES.has(candidate)
        );

    if (invalidRole) {
      results.push({
        id: "AUTH-010",
        expected: "403",
        actual: "INVALID_ROLE_FIXTURE_EXISTS",
        status: "SKIPPED",
        note:
          "Invalid role data exists, but production data was not modified."
      });
    } else {
      results.push({
        id: "AUTH-010",
        expected: "403",
        actual: "NO_FIXTURE",
        status: "SKIPPED",
        note:
          "No invalid-role fixture exists. Production data was not modified."
      });
    }
  } catch {
    results.push({
      id: "AUTH-010",
      expected: "403",
      actual: "NO_FIXTURE",
      status: "SKIPPED",
      note:
        "Invalid-role fixture could not be inspected safely."
    });
  }

  /*
   * AUTH-011
   * Valid member
   */
  try {
    await authorizeRequest(
      syntheticRequest(
        token,
        workspaceId
      )
    );

    results.push({
      id: "AUTH-011",
      expected: "AUTHORIZED",
      actual:
        role
          ? `AUTHORIZED:${role}`
          : "AUTHORIZED",
      status: "PASS"
    });
  } catch {
    results.push({
      id: "AUTH-011",
      expected: "AUTHORIZED",
      actual: "DENIED",
      status: "FAIL"
    });
  }

  /*
   * AUTH-012
   * Wrong workspace boundary
   *
   * Uses the same safe non-member fixture
   * when one exists.
   */
  if (nonMemberWorkspaceId) {
    const wrongWorkspaceResult =
      await expectDenied(
        "AUTH-012",
        syntheticRequest(
          token,
          nonMemberWorkspaceId
        ),
        403
      );

    results.push({
      ...wrongWorkspaceResult,
      note:
        "Wrong-workspace boundary tested using an active workspace where the current user has no membership."
    });
  } else {
    results.push({
      id: "AUTH-012",
      expected: "403_OR_404",
      actual: "NO_FIXTURE",
      status: "SKIPPED",
      note:
        "No safe alternate workspace fixture is available."
    });
  }

  const passed =
    results.filter(
      (result) =>
        result.status === "PASS"
    ).length;

  const failed =
    results.filter(
      (result) =>
        result.status === "FAIL"
    ).length;

  const skipped =
    results.filter(
      (result) =>
        result.status === "SKIPPED"
    ).length;

  return res
    .status(failed === 0 ? 200 : 500)
    .json({
      ok: failed === 0,
      test: "P2_AUTHORIZATION",

      /*
       * Safe metadata only.
       * No token is returned.
       */
      workspace_id: workspaceId,
      role,

      summary: {
        total: results.length,
        passed,
        failed,
        skipped
      },

      results
    });
}

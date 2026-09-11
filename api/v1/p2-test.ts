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

function getHeader(req: VercelRequest, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getStatus(error: unknown): number | undefined {
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

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as {
    code?: unknown;
  };

  return typeof candidate.code === "string" ? candidate.code : undefined;
}

function createSyntheticRequest(
  authorization?: string,
  workspaceId?: string
): VercelRequest {
  return {
    headers: {
      ...(authorization !== undefined
        ? { authorization }
        : {}),
      ...(workspaceId !== undefined
        ? { "x-workspace-id": workspaceId }
        : {})
    }
  } as VercelRequest;
}

async function expectAuthorizationFailure(
  id: string,
  req: VercelRequest,
  expectedStatus: number
): Promise<TestResult> {
  try {
    await authorizeRequest(req);

    return {
      id,
      expected: `${expectedStatus}`,
      actual: "200",
      status: "FAIL",
      note: "Request was unexpectedly authorized."
    };
  } catch (error) {
    const actualStatus = getStatus(error);

    return {
      id,
      expected: `${expectedStatus}`,
      actual: actualStatus ? `${actualStatus}` : "UNKNOWN",
      status: actualStatus === expectedStatus ? "PASS" : "FAIL"
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
   * Bootstrap authorization.
   *
   * The incoming request must already be authenticated.
   * The access token is used only inside the server process.
   * It is never returned, logged, persisted, or included in test results.
   */
  let current;

  try {
    current = await authorizeRequest(req);
  } catch {
    return res.status(401).json({
      ok: false,
      error: "AUTHENTICATION_REQUIRED",
      message: "A valid authenticated session is required to run P2 tests."
    });
  }

  const token = getHeader(req, "authorization");
  const workspaceId = getHeader(req, "x-workspace-id");

  if (!token || !workspaceId) {
    return res.status(400).json({
      ok: false,
      error: "P2_BOOTSTRAP_HEADERS_MISSING"
    });
  }

  const results: TestResult[] = [];

  /*
   * AUTH-001
   * No Authorization header -> 401
   */
  results.push(
    await expectAuthorizationFailure(
      "AUTH-001",
      createSyntheticRequest(undefined, workspaceId),
      401
    )
  );

  /*
   * AUTH-002
   * Malformed Authorization header -> 401
   */
  results.push(
    await expectAuthorizationFailure(
      "AUTH-002",
      createSyntheticRequest("NotBearerToken", workspaceId),
      401
    )
  );

  /*
   * AUTH-003
   * Valid token + valid workspace -> continue
   */
  try {
    const authorized = await authorizeRequest(
      createSyntheticRequest(token, workspaceId)
    );

    results.push({
      id: "AUTH-003",
      expected: "AUTHORIZED",
      actual: "AUTHORIZED",
      status: "PASS",
      note: "Authenticated request continued through authorization middleware."
    });

    /*
     * AUTH-011
     * Current valid workspace/member -> PASS
     */
    results.push({
      id: "AUTH-011",
      expected: "AUTHORIZED",
      actual: authorized.authorization?.roles?.[0]
        ? `AUTHORIZED:${authorized.authorization.roles[0]}`
        : "AUTHORIZED",
      status: "PASS"
    });
  } catch {
    results.push({
      id: "AUTH-003",
      expected: "AUTHORIZED",
      actual: "DENIED",
      status: "FAIL"
    });

    results.push({
      id: "AUTH-011",
      expected: "AUTHORIZED",
      actual: "DENIED",
      status: "FAIL"
    });
  }

  /*
   * AUTH-004
   * No workspace header -> 400
   */
  results.push(
    await expectAuthorizationFailure(
      "AUTH-004",
      createSyntheticRequest(token),
      400
    )
  );

  /*
   * AUTH-005
   * Invalid workspace UUID -> 400
   */
  results.push(
    await expectAuthorizationFailure(
      "AUTH-005",
      createSyntheticRequest(token, "not-a-uuid"),
      400
    )
  );

  /*
   * AUTH-006
   * Valid UUID but nonexistent workspace -> 404
   */
  const nonexistentWorkspace =
    "00000000-0000-0000-0000-000000000000";

  results.push(
    await expectAuthorizationFailure(
      "AUTH-006",
      createSyntheticRequest(token, nonexistentWorkspace),
      404
    )
  );

  /*
   * Discover safe fixtures without mutating production data.
   */
  let activeOtherWorkspaceId: string | undefined;
  let inactiveWorkspaceId: string | undefined;
  let inactiveMembershipWorkspaceId: string | undefined;

  try {
    const { data: activeWorkspaces } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("is_active", true)
      .neq("id", workspaceId)
      .limit(20);

    const candidateIds = (activeWorkspaces ?? [])
      .map((row) => row.id)
      .filter((id): id is string => typeof id === "string");

    if (candidateIds.length > 0) {
      const { data: memberships } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", current.user.id)
        .eq("is_active", true)
        .in("workspace_id", candidateIds);

      const memberIds = new Set(
        (memberships ?? [])
          .map((row) => row.workspace_id)
          .filter(
            (id): id is string => typeof id === "string"
          )
      );

      activeOtherWorkspaceId = candidateIds.find(
        (id) => !memberIds.has(id)
      );
    }

    const { data: inactiveWorkspaces } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("is_active", false)
      .limit(1);

    inactiveWorkspaceId = inactiveWorkspaces?.[0]?.id;

    const { data: inactiveMemberships } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", current.user.id)
      .eq("is_active", false)
      .limit(1);

    inactiveMembershipWorkspaceId =
      inactiveMemberships?.[0]?.workspace_id;
  } catch {
    /*
     * Fixture discovery failure does not expose database errors.
     * Tests depending on fixtures will remain SKIPPED.
     */
  }

  /*
   * AUTH-007
   * Inactive workspace -> 403
   */
  if (inactiveWorkspaceId) {
    results.push(
      await expectAuthorizationFailure(
        "AUTH-007",
        createSyntheticRequest(token, inactiveWorkspaceId),
        403
      )
    );
  } else {
    results.push({
      id: "AUTH-007",
      expected: "403",
      actual: "NO_FIXTURE",
      status: "SKIPPED",
      note: "No inactive workspace fixture is available."
    });
  }

  /*
   * AUTH-008
   * Active workspace where current user is not a member -> 403
   */
  if (activeOtherWorkspaceId) {
    results.push(
      await expectAuthorizationFailure(
        "AUTH-008",
        createSyntheticRequest(token, activeOtherWorkspaceId),
        403
      )
    );
  } else {
    results.push({
      id: "AUTH-008",
      expected: "403",
      actual: "NO_FIXTURE",
      status: "SKIPPED",
      note: "No active non-member workspace fixture is available."
    });
  }

  /*
   * AUTH-009
   * Current user has inactive membership -> 403
   */
  if (inactiveMembershipWorkspaceId) {
    results.push(
      await expectAuthorizationFailure(
        "AUTH-009",
        createSyntheticRequest(
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
      note: "No inactive membership fixture is available."
    });
  }

  /*
   * AUTH-010
   * Invalid role -> 403
   *
   * We do NOT mutate production data to create an invalid role.
   * If the database enum permits only valid roles, this test is skipped.
   */
  try {
    const { data: memberships } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .limit(100);

    const invalidRole = (memberships ?? [])
      .map((row) => row.role)
      .find(
        (role) =>
          typeof role === "string" &&
          !ALLOWED_ROLES.has(role)
      );

    if (invalidRole) {
      /*
       * An invalid role already existing in production should be
       * rejected by middleware. We cannot safely construct it if
       * the underlying enum does not permit it.
       */
      results.push({
        id: "AUTH-010",
        expected: "403",
        actual: "FIXTURE_DETECTED",
        status: "SKIPPED",
        note: "Invalid role data exists, but no production data was mutated for testing."
      });
    } else {
      results.push({
        id: "AUTH-010",
        expected: "403",
        actual: "NO_FIXTURE",
        status: "SKIPPED",
        note: "No invalid-role fixture exists; production data was not modified."
      });
    }
  } catch {
    results.push({
      id: "AUTH-010",
      expected: "403",
      actual: "NO_FIXTURE",
      status: "SKIPPED",
      note: "Invalid-role fixture cannot be safely created."
    });
  }

  /*
   * AUTH-012
   * Wrong workspace boundary.
   *
   * If a valid active workspace exists where the user is not a member,
   * this is already covered by the real authorization boundary.
   */
  if (activeOtherWorkspaceId) {
    const result = await expectAuthorizationFailure(
      "AUTH-012",
      createSyntheticRequest(token, activeOtherWorkspaceId),
      403
    );

    results.push({
      ...result,
      note:
        "Wrong-workspace boundary tested using an active workspace where the current user has no membership."
    });
  } else {
    results.push({
      id: "AUTH-012",
      expected: "403_OR_404",
      actual: "NO_FIXTURE",
      status: "SKIPPED",
      note: "No safe alternate workspace fixture is available."
    });
  }

  const passed = results.filter(
    (result) => result.status === "PASS"
  ).length;

  const failed = results.filter(
    (result) => result.status === "FAIL"
  ).length;

  const skipped = results.filter(
    (result) => result.status === "SKIPPED"
  ).length;

  return res.status(failed === 0 ? 200 : 500).json({
    ok: failed === 0,
    test: "P2_AUTHORIZATION",
    workspace_id: current.workspace.id,
    role: current.membership.role,
    summary: {
      total: results.length,
      passed,
      failed,
      skipped
    },
    results
  });
}

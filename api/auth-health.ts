import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authorizeRequest } from "../core/authorization/middleware.js";
import { errorResponse } from "../shared/errors/http.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    const { authorization } = await authorizeRequest(req);

    return res.status(200).json({
      ok: true,
      service: "SPECIAL ALI",
      component: "AUTHORIZATION",
      status: "AUTHORIZED",
      identity: {
        userId: authorization.identity.userId,
        tenantId: authorization.identity.tenantId,
        workspaceId: authorization.identity.workspaceId,
        actorType: authorization.identity.actorType,
        authenticationMethod:
          authorization.identity.authenticationMethod,
        requestId: authorization.identity.requestId
      },
      roles: authorization.roles
    });
  } catch (error) {
    const response = errorResponse(error);

    return res.status(response.statusCode).json(response.body);
  }
}

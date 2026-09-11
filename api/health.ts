import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  return res.status(200).json({
    ok: true,
    service: "SPECIAL ALI",
    component: "API",
    version: "0.1.0",
    status: "READY"
  });
}

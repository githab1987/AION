import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../infrastructure/supabase/client.js";

const TEST_USER_ID =
  "0151bf45-1a28-4fa7-8a76-fff217b0fdf2";

function send(
  res: VercelResponse,
  status: number,
  body: Record<string, unknown>
) {
  return res.status(status).json(body);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return send(res, 405, {
      ok: false,
      error: "METHOD_NOT_ALLOWED"
    });
  }

  const resetKey =
    process.env.SPECIAL_ALI_TEST_RESET_KEY;

  if (!resetKey) {
    return send(res, 500, {
      ok: false,
      error: "RESET_KEY_NOT_CONFIGURED"
    });
  }

  const suppliedKey =
    req.headers["x-special-ali-reset-key"];

  if (
    typeof suppliedKey !== "string" ||
    suppliedKey !== resetKey
  ) {
    return send(res, 401, {
      ok: false,
      error: "RESET_KEY_INVALID"
    });
  }

  const body = req.body ?? {};
  const password = body.password;

  if (typeof password !== "string") {
    return send(res, 400, {
      ok: false,
      error: "PASSWORD_REQUIRED"
    });
  }

  if (password.length < 8) {
    return send(res, 400, {
      ok: false,
      error: "PASSWORD_TOO_SHORT",
      message: "Password must contain at least 8 characters"
    });
  }

  try {
    const { data, error } =
      await supabaseAdmin.auth.admin.updateUserById(
        TEST_USER_ID,
        {
          password
        }
      );

    if (error) {
      return send(res, 500, {
        ok: false,
        error: "PASSWORD_UPDATE_FAILED",
        message: error.message
      });
    }

    return send(res, 200, {
      ok: true,
      service: "SPECIAL ALI",
      component: "AUTH_TEST",
      status: "PASSWORD_UPDATED",
      user_id: data.user.id
    });
  } catch {
    return send(res, 500, {
      ok: false,
      error: "PASSWORD_UPDATE_EXCEPTION"
    });
  }
        }

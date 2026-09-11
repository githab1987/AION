import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      ok: false,
      error: "SUPABASE_PUBLIC_CONFIG_MISSING"
    });
  }

  const body = req.body ?? {};

  const email =
    typeof body.email === "string"
      ? body.email.trim()
      : "";

  const password =
    typeof body.password === "string"
      ? body.password
      : "";

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      error: "EMAIL_PASSWORD_REQUIRED",
      diagnostics: {
        bodyType: typeof req.body,
        emailReceived: Boolean(email),
        passwordReceived: Boolean(password),
        contentType:
          req.headers["content-type"] ?? null
      }
    });
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  if (error || !data.session) {
    return res.status(401).json({
      ok: false,
      error: "LOGIN_FAILED",
      supabase_error: error?.code ?? null,
      supabase_message: error?.message ?? null,
      diagnostics: {
        emailReceived: Boolean(email),
        passwordReceived: Boolean(password),
        contentType:
          req.headers["content-type"] ?? null
      }
    });
  }

  return res.status(200).json({
    ok: true,
    message: "JWT_CREATED"
  });
}

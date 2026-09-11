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

  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      ok: false,
      error: "EMAIL_PASSWORD_REQUIRED"
    });
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
  );

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  if (error || !data.session) {
    return res.status(401).json({
      ok: false,
      error: "LOGIN_FAILED"
    });
  }

  return res.status(200).json({
    ok: true,
    access_token: data.session.access_token
  });
}

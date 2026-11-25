// POST /api/auth/logout — destroy the current session and clear the cookie.
import { jsonResponse } from "../../_lib/store.js";
import { destroySession, clearSessionCookieHeader } from "../../_lib/session.js";

export async function onRequestPost({ request, env }) {
  await destroySession(request, env);
  return jsonResponse({ ok: true }, 200, { "Set-Cookie": clearSessionCookieHeader() });
}

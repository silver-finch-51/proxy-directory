// POST /api/admin/login — username "admin" + ADMIN_PASSWORD (Workers Secret).
// Same login method as before; on success it now creates a KV-backed session
// (role "admin") issued via an HttpOnly cookie instead of a bearer token.
import { verifyPassword } from "../../_lib/auth.js";
import { jsonResponse, errorResponse } from "../../_lib/store.js";
import { createSession, sessionCookieHeader } from "../../_lib/session.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("请求体不是合法 JSON");
  }
  const { username, password } = body || {};
  if (username !== "admin" || !(await verifyPassword(env, password))) {
    return errorResponse("用户名或密码错误", 401);
  }
  const { token } = await createSession(env, { id: "admin", username: "admin", role: "admin" });
  return jsonResponse(
    { ok: true, username: "admin", role: "admin" },
    200,
    { "Set-Cookie": sessionCookieHeader(token) },
  );
}

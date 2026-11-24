// POST /api/admin/login — username "admin" + ADMIN_PASSWORD (Workers Secret).
// Returns a 24h HMAC-signed bearer token. Fails closed when ADMIN_PASSWORD
// is not configured.
import { verifyPassword, signToken } from "../../_lib/auth.js";
import { jsonResponse, errorResponse } from "../../_lib/store.js";

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
  const token = await signToken(env, "admin");
  return jsonResponse({ ok: true, token });
}

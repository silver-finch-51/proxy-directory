// Middleware for everything under /api/admin/*.
// The login endpoint is public; all other admin routes require a valid
// bearer token (HMAC-signed, 24h, see _lib/auth.js).
import { verifyToken, bearerToken } from "../../_lib/auth.js";
import { errorResponse } from "../../_lib/store.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (url.pathname === "/api/admin/login") return context.next();
  const payload = await verifyToken(env, bearerToken(request));
  if (!payload) return errorResponse("未登录或登录已过期", 401);
  return context.next();
}

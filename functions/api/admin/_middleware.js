// Middleware for everything under /api/admin/*.
// The login endpoint is public; all other admin routes require a valid
// session (HttpOnly cookie, see _lib/session.js) with role "admin".
// Authenticated non-admin users get 403; no/invalid session gets 401.
import { getSession } from "../../_lib/session.js";
import { errorResponse } from "../../_lib/store.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (url.pathname === "/api/admin/login") return context.next();
  const session = await getSession(request, env);
  if (!session) return errorResponse("未登录或登录已过期", 401);
  if (session.role !== "admin") return errorResponse("无管理权限", 403);
  return context.next();
}

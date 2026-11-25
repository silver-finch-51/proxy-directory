// POST /api/auth/change-password — logged-in regular users only.
// The admin password lives in the ADMIN_PASSWORD secret and cannot be
// changed here.
import { loadUsers, saveUsers, jsonResponse, errorResponse } from "../../_lib/store.js";
import {
  getSession,
  hashPassword,
  randomHex,
  verifyUserPassword,
  validatePassword,
} from "../../_lib/session.js";

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return errorResponse("未登录", 401);
  if (session.role !== "user") return errorResponse("管理员密码请在 Cloudflare 后台修改", 400);
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("请求体不是合法 JSON");
  }
  const { currentPassword, newPassword } = body || {};
  const pErr = validatePassword(newPassword);
  if (pErr) return errorResponse(pErr);
  const users = await loadUsers(env);
  const user = users.find((u) => u.id === session.userId);
  if (!user) return errorResponse("账号不存在", 404);
  if (!(await verifyUserPassword(user, currentPassword))) {
    return errorResponse("当前密码不正确", 401);
  }
  user.salt = randomHex(16);
  user.passwordHash = await hashPassword(newPassword, user.salt);
  await saveUsers(env, users);
  return jsonResponse({ ok: true });
}

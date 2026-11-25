// DELETE /api/auth/account — logged-in regular users only: delete the
// account, all of its sessions, and clear the cookie. Admin accounts
// cannot be deleted here.
import { loadUsers, saveUsers, loadSessions, saveSessions, jsonResponse, errorResponse } from "../../_lib/store.js";
import { getSession, clearSessionCookieHeader } from "../../_lib/session.js";

export async function onRequestDelete({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return errorResponse("未登录", 401);
  if (session.role !== "user") return errorResponse("管理员账号不可注销", 400);
  const users = await loadUsers(env);
  await saveUsers(env, users.filter((u) => u.id !== session.userId));
  const sessions = await loadSessions(env);
  for (const token of Object.keys(sessions)) {
    if (sessions[token].userId === session.userId) delete sessions[token];
  }
  await saveSessions(env, sessions);
  return jsonResponse({ ok: true }, 200, { "Set-Cookie": clearSessionCookieHeader() });
}

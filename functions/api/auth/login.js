// POST /api/auth/login — visitor login with username + password.
import { loadUsers, jsonResponse, errorResponse } from "../../_lib/store.js";
import {
  verifyUserPassword,
  createSession,
  sessionCookieHeader,
  findUserByName,
} from "../../_lib/session.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("请求体不是合法 JSON");
  }
  const { username, password } = body || {};
  const users = await loadUsers(env);
  const user = findUserByName(users, username);
  if (!user || !(await verifyUserPassword(user, password))) {
    return errorResponse("用户名或密码错误", 401);
  }
  const { token } = await createSession(env, user);
  return jsonResponse(
    { ok: true, username: user.username, role: user.role },
    200,
    { "Set-Cookie": sessionCookieHeader(token) },
  );
}

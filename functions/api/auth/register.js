// POST /api/auth/register — visitor self-registration.
// Always creates role "user"; `role` is never read from the request body.
import { loadUsers, saveUsers, jsonResponse, errorResponse } from "../../_lib/store.js";
import {
  hashPassword,
  randomHex,
  createSession,
  sessionCookieHeader,
  validateUsername,
  validatePassword,
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
  const uErr = validateUsername(username);
  if (uErr) return errorResponse(uErr);
  const pErr = validatePassword(password);
  if (pErr) return errorResponse(pErr);
  const name = username.trim();
  const users = await loadUsers(env);
  if (findUserByName(users, name)) return errorResponse("用户名已被注册", 409);
  const salt = randomHex(16);
  const user = {
    id: "user-" + randomHex(8),
    username: name,
    passwordHash: await hashPassword(password, salt),
    salt,
    role: "user",
    createdAt: Date.now(),
  };
  users.push(user);
  await saveUsers(env, users);
  const { token } = await createSession(env, user);
  return jsonResponse(
    { ok: true, username: user.username, role: "user" },
    200,
    { "Set-Cookie": sessionCookieHeader(token) },
  );
}

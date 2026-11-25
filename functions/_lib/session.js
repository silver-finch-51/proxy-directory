// Visitor accounts + KV-backed sessions.
//
// Users live in the SITE_DATA KV `users` key:
//   [{ id, username, passwordHash, salt, role, createdAt }]
// Sessions live in the `sessions` key:
//   { token: { userId, username, role, createdAt, expiresAt } }
//
// Passwords are stored as SHA-256(salt + ":" + password) with a random
// per-user salt — never in plaintext. `role` is never accepted from the
// client: registration always creates role "user"; the admin session is
// created server-side by /api/admin/login with role "admin".
import { loadSessions, saveSessions } from "./store.js";

const encoder = new TextEncoder();

export const SESSION_COOKIE = "session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomHex(bytes = 16) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return hex(buf);
}

export async function hashPassword(password, salt) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(salt + ":" + password));
  return hex(digest);
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function verifyUserPassword(user, password) {
  if (!user || typeof password !== "string") return false;
  const hash = await hashPassword(password, user.salt);
  return constantTimeEqual(hash, user.passwordHash);
}

export function validateUsername(username) {
  if (typeof username !== "string") return "用户名必填";
  const name = username.trim();
  if (name.length < 2 || name.length > 20) return "用户名需为 2–20 个字符";
  if (/\s/.test(name)) return "用户名不能包含空格";
  if (name.toLowerCase() === "admin") return "该用户名不可注册";
  return null;
}

export function validatePassword(password) {
  if (typeof password !== "string" || password.length < 6) return "密码至少 6 位";
  return null;
}

export function findUserByName(users, username) {
  const name = String(username || "").trim().toLowerCase();
  return (users || []).find((u) => String(u.username || "").toLowerCase() === name) || null;
}

function getCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export async function createSession(env, user) {
  const sessions = await loadSessions(env);
  const token = crypto.randomUUID();
  const now = Date.now();
  sessions[token] = {
    userId: user.id,
    username: user.username,
    role: user.role,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  await saveSessions(env, sessions);
  return { token, expiresAt: now + SESSION_TTL_MS };
}

export async function getSession(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const sessions = await loadSessions(env);
  const s = sessions[token];
  if (!s) return null;
  if (typeof s.expiresAt !== "number" || s.expiresAt < Date.now()) {
    delete sessions[token];
    await saveSessions(env, sessions);
    return null;
  }
  return { ...s, token };
}

export async function destroySession(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return;
  const sessions = await loadSessions(env);
  if (sessions[token]) {
    delete sessions[token];
    await saveSessions(env, sessions);
  }
}

export function sessionCookieHeader(token) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

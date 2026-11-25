// GET /api/auth/me — current login state from the session cookie.
import { loadUsers, jsonResponse } from "../../_lib/store.js";
import { getSession } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return jsonResponse({ loggedIn: false });
  let createdAt = null;
  if (session.userId && session.userId !== "admin") {
    const users = await loadUsers(env);
    const user = users.find((u) => u.id === session.userId);
    if (user) createdAt = user.createdAt || null;
  }
  return jsonResponse({
    loggedIn: true,
    username: session.username,
    role: session.role,
    createdAt,
  });
}

// GET /api/admin/users — read-only user list for the admin panel.
// Admin-only (enforced by the /api/admin middleware). Never returns any
// password-related fields: only username and registration time.
import { loadUsers, jsonResponse } from "../../_lib/store.js";

export async function onRequestGet({ env }) {
  const users = await loadUsers(env);
  const list = users
    .map((u) => ({ username: u.username, createdAt: u.createdAt || null }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return jsonResponse({ ok: true, users: list });
}

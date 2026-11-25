// KV helpers. One namespace (SITE_DATA) with seven keys:
//   settings     -> { siteName: string }
//   apps         -> [ app, ... ]          (full app records, see seed/apps.json)
//   airports     -> [ airport, ... ]      (starts empty)
//   vps          -> [ vps, ... ]          (starts with 10 seeded providers)
//   star_history -> { "YYYY-MM-DD": { slug: stars } }  (daily GitHub star snapshots)
//   users        -> [ user, ... ]         (registered visitor accounts)
//   sessions     -> { token: session }    (login sessions, see _lib/session.js)
//   tutorials    -> [ tutorial, ... ]     (how-to guides, see seed/tutorials.json)

export async function loadSettings(env) {
  const raw = await env.SITE_DATA.get("settings", "json");
  return raw || { siteName: "代理客户端大全" };
}

export async function saveSettings(env, settings) {
  await env.SITE_DATA.put("settings", JSON.stringify(settings));
}

export async function loadApps(env) {
  return (await env.SITE_DATA.get("apps", "json")) || [];
}

export async function saveApps(env, apps) {
  await env.SITE_DATA.put("apps", JSON.stringify(apps));
}

export async function loadAirports(env) {
  return (await env.SITE_DATA.get("airports", "json")) || [];
}

export async function saveAirports(env, airports) {
  await env.SITE_DATA.put("airports", JSON.stringify(airports));
}

export async function loadVps(env) {
  return (await env.SITE_DATA.get("vps", "json")) || [];
}

export async function saveVps(env, vps) {
  await env.SITE_DATA.put("vps", JSON.stringify(vps));
}

export async function loadHistory(env) {
  return (await env.SITE_DATA.get("star_history", "json")) || {};
}

export async function saveHistory(env, history) {
  await env.SITE_DATA.put("star_history", JSON.stringify(history));
}

export async function loadUsers(env) {
  return (await env.SITE_DATA.get("users", "json")) || [];
}

export async function saveUsers(env, users) {
  await env.SITE_DATA.put("users", JSON.stringify(users));
}

export async function loadSessions(env) {
  return (await env.SITE_DATA.get("sessions", "json")) || {};
}

export async function saveSessions(env, sessions) {
  await env.SITE_DATA.put("sessions", JSON.stringify(sessions));
}

export async function loadTutorials(env) {
  return (await env.SITE_DATA.get("tutorials", "json")) || [];
}

export async function saveTutorials(env, tutorials) {
  await env.SITE_DATA.put("tutorials", JSON.stringify(tutorials));
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ ok: false, error: message }, status);
}

// KV helpers. One namespace (SITE_DATA) with five keys:
//   settings     -> { siteName: string }
//   apps         -> [ app, ... ]          (full app records, see seed/apps.json)
//   airports     -> [ airport, ... ]      (starts empty)
//   vps          -> [ vps, ... ]          (starts with 10 seeded providers)
//   star_history -> { "YYYY-MM-DD": { slug: stars } }  (daily GitHub star snapshots)

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

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ ok: false, error: message }, status);
}

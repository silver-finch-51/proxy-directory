// Admin VPS collection: GET (full list, including offline) and POST (create).
import { loadVps, saveVps, jsonResponse, errorResponse } from "../../_lib/store.js";
import { normalizeVps, newVpsId, isHttpUrl } from "../../_lib/validate.js";

export async function onRequestGet({ env }) {
  const vps = await loadVps(env);
  return jsonResponse({ ok: true, vps });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("请求体不是合法 JSON");
  }
  const vps = await loadVps(env);
  if (!body || !body.name || typeof body.name !== "string" || !body.name.trim()) {
    return errorResponse("name 必填");
  }
  if (body.officialUrl && !isHttpUrl(body.officialUrl)) {
    return errorResponse("officialUrl 必须是 http(s) 链接");
  }
  const provider = normalizeVps(body, null);
  provider.id = newVpsId();
  vps.push(provider);
  await saveVps(env, vps);
  return jsonResponse({ ok: true, vps: provider }, 201);
}

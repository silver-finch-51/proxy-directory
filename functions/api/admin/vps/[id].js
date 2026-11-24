// Admin single VPS provider: PUT (update) and DELETE.
import { loadVps, saveVps, jsonResponse, errorResponse } from "../../../_lib/store.js";
import { normalizeVps, isHttpUrl } from "../../../_lib/validate.js";

export async function onRequestPut({ request, env, params }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("请求体不是合法 JSON");
  }
  const vps = await loadVps(env);
  const idx = vps.findIndex((v) => v.id === params.id);
  if (idx === -1) return errorResponse("VPS 不存在", 404);
  if (body.officialUrl && !isHttpUrl(body.officialUrl)) {
    return errorResponse("officialUrl 必须是 http(s) 链接");
  }
  const updated = normalizeVps(body, vps[idx]);
  vps[idx] = updated;
  await saveVps(env, vps);
  return jsonResponse({ ok: true, vps: updated });
}

export async function onRequestDelete({ env, params }) {
  const vps = await loadVps(env);
  const idx = vps.findIndex((v) => v.id === params.id);
  if (idx === -1) return errorResponse("VPS 不存在", 404);
  const [removed] = vps.splice(idx, 1);
  await saveVps(env, vps);
  return jsonResponse({ ok: true, removed: removed.id });
}

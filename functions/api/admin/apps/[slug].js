// Admin single app: PUT (update; slug itself is immutable) and DELETE.
import { loadApps, saveApps, jsonResponse, errorResponse } from "../../../_lib/store.js";
import { normalizeApp } from "../../../_lib/validate.js";

export async function onRequestPut({ request, env, params }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("请求体不是合法 JSON");
  }
  const apps = await loadApps(env);
  const idx = apps.findIndex((a) => a.slug === params.slug);
  if (idx === -1) return errorResponse("应用不存在", 404);
  const updated = normalizeApp({ ...body, slug: params.slug }, apps[idx]);
  apps[idx] = updated;
  await saveApps(env, apps);
  return jsonResponse({ ok: true, app: updated });
}

export async function onRequestDelete({ env, params }) {
  const apps = await loadApps(env);
  const idx = apps.findIndex((a) => a.slug === params.slug);
  if (idx === -1) return errorResponse("应用不存在", 404);
  const [removed] = apps.splice(idx, 1);
  await saveApps(env, apps);
  return jsonResponse({ ok: true, removed: removed.slug });
}

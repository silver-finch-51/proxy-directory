// Admin apps collection: GET (full list, including unpublished) and POST (create).
import { loadApps, saveApps, jsonResponse, errorResponse } from "../../_lib/store.js";
import { normalizeApp } from "../../_lib/validate.js";

export async function onRequestGet({ env }) {
  const apps = await loadApps(env);
  return jsonResponse({ ok: true, apps });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("请求体不是合法 JSON");
  }
  const apps = await loadApps(env);
  if (!body || typeof body.slug !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(body.slug)) {
    return errorResponse("slug 必填，只能用小写字母、数字和连字符");
  }
  if (apps.some((a) => a.slug === body.slug)) {
    return errorResponse("slug 已存在", 409);
  }
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return errorResponse("name 必填");
  }
  if (!body.downloadUrl || typeof body.downloadUrl !== "string" || !body.downloadUrl.trim()) {
    return errorResponse("downloadUrl（下载链接）必填");
  }
  const app = normalizeApp(body, null);
  app.id = apps.reduce((m, a) => Math.max(m, a.id || 0), 0) + 1;
  apps.push(app);
  await saveApps(env, apps);
  return jsonResponse({ ok: true, app }, 201);
}

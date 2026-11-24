// Admin settings: GET and PUT (currently only the site name).
import { loadSettings, saveSettings, jsonResponse, errorResponse } from "../../_lib/store.js";

export async function onRequestGet({ env }) {
  const settings = await loadSettings(env);
  return jsonResponse({ ok: true, settings });
}

export async function onRequestPut({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("请求体不是合法 JSON");
  }
  if (!body || typeof body.siteName !== "string" || !body.siteName.trim()) {
    return errorResponse("siteName 必填");
  }
  const settings = { siteName: body.siteName.trim() };
  await saveSettings(env, settings);
  return jsonResponse({ ok: true, settings });
}

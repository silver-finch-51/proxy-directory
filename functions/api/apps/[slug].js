// GET /api/apps/:slug — single published app for the detail page.
import { loadApps, jsonResponse, errorResponse } from "../../_lib/store.js";

export async function onRequestGet({ env, params }) {
  const apps = await loadApps(env);
  const app = apps.find((a) => a.slug === params.slug && a.published !== false);
  if (!app) return errorResponse("应用不存在", 404);
  return jsonResponse({ ok: true, app });
}

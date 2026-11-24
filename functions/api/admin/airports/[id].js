// Admin single airport: PUT (update) and DELETE.
import { loadAirports, saveAirports, jsonResponse, errorResponse } from "../../../_lib/store.js";
import { normalizeAirport, isHttpUrl } from "../../../_lib/validate.js";

export async function onRequestPut({ request, env, params }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("请求体不是合法 JSON");
  }
  const airports = await loadAirports(env);
  const idx = airports.findIndex((a) => a.id === params.id);
  if (idx === -1) return errorResponse("机场不存在", 404);
  if (body.officialUrl && !isHttpUrl(body.officialUrl)) {
    return errorResponse("officialUrl 必须是 http(s) 链接");
  }
  const updated = normalizeAirport(body, airports[idx]);
  airports[idx] = updated;
  await saveAirports(env, airports);
  return jsonResponse({ ok: true, airport: updated });
}

export async function onRequestDelete({ env, params }) {
  const airports = await loadAirports(env);
  const idx = airports.findIndex((a) => a.id === params.id);
  if (idx === -1) return errorResponse("机场不存在", 404);
  const [removed] = airports.splice(idx, 1);
  await saveAirports(env, airports);
  return jsonResponse({ ok: true, removed: removed.id });
}

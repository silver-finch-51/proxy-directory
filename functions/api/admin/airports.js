// Admin airports collection: GET (full list, including offline) and POST (create).
import { loadAirports, saveAirports, jsonResponse, errorResponse } from "../../_lib/store.js";
import { normalizeAirport, newAirportId, isHttpUrl } from "../../_lib/validate.js";

export async function onRequestGet({ env }) {
  const airports = await loadAirports(env);
  return jsonResponse({ ok: true, airports });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("请求体不是合法 JSON");
  }
  const airports = await loadAirports(env);
  if (!body || !body.name || typeof body.name !== "string" || !body.name.trim()) {
    return errorResponse("name 必填");
  }
  if (body.officialUrl && !isHttpUrl(body.officialUrl)) {
    return errorResponse("officialUrl 必须是 http(s) 链接");
  }
  const airport = normalizeAirport(body, null);
  airport.id = newAirportId();
  airports.push(airport);
  await saveAirports(env, airports);
  return jsonResponse({ ok: true, airport }, 201);
}

// Admin single tutorial: GET, PUT, DELETE by id.
import { loadTutorials, saveTutorials, jsonResponse, errorResponse } from "../../../_lib/store.js";
import { normalizeTutorial } from "../../../_lib/validate.js";

export async function onRequestGet({ env, params }) {
  const tutorials = await loadTutorials(env);
  const tutorial = tutorials.find((t) => t.id === params.id);
  if (!tutorial) return errorResponse("教程不存在", 404);
  return jsonResponse({ ok: true, tutorial });
}

export async function onRequestPut({ request, env, params }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("请求体不是合法 JSON");
  }
  const tutorials = await loadTutorials(env);
  const idx = tutorials.findIndex((t) => t.id === params.id);
  if (idx === -1) return errorResponse("教程不存在", 404);
  tutorials[idx] = normalizeTutorial(body, tutorials[idx]);
  await saveTutorials(env, tutorials);
  return jsonResponse({ ok: true, tutorial: tutorials[idx] });
}

export async function onRequestDelete({ env, params }) {
  const tutorials = await loadTutorials(env);
  const idx = tutorials.findIndex((t) => t.id === params.id);
  if (idx === -1) return errorResponse("教程不存在", 404);
  tutorials.splice(idx, 1);
  await saveTutorials(env, tutorials);
  return jsonResponse({ ok: true });
}

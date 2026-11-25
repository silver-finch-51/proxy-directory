// Admin tutorials collection: GET (full list, including offline) and POST (create).
import { loadTutorials, saveTutorials, jsonResponse, errorResponse } from "../../_lib/store.js";
import { normalizeTutorial, newTutorialId } from "../../_lib/validate.js";

export async function onRequestGet({ env }) {
  const tutorials = await loadTutorials(env);
  return jsonResponse({ ok: true, tutorials });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("请求体不是合法 JSON");
  }
  const tutorials = await loadTutorials(env);
  if (!body || !body.title || typeof body.title !== "string" || !body.title.trim()) {
    return errorResponse("title 必填");
  }
  const tutorial = normalizeTutorial(body, null);
  tutorial.id = newTutorialId();
  tutorials.push(tutorial);
  await saveTutorials(env, tutorials);
  return jsonResponse({ ok: true, tutorial }, 201);
}
